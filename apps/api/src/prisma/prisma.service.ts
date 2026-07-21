import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma + Neon (serverless Postgres) notes:
 * - Prefer the **pooled** connection string (host contains `-pooler`).
 * - Append `pgbouncer=true` and keep `connection_limit=1` for Nest long-lived process.
 * - Do NOT use `channel_binding=require` with Prisma/pgbouncer (causes flaky closes).
 * - Optional: set DIRECT_URL to the non-pooler host for migrations only.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connecting: Promise<void> | null = null;

  constructor() {
    super({
      datasources: {
        db: {
          url: PrismaService.resolveDatabaseUrl(),
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
          : ['error'],
      errorFormat: 'pretty',
    });
  }

  /**
   * Normalize DATABASE_URL for Prisma + Neon pooler stability.
   */
  static resolveDatabaseUrl(raw?: string): string {
    const input = (raw || process.env.DATABASE_URL || '').trim();
    if (!input) return input;

    try {
      const u = new URL(input);
      // Prisma expects postgresql://
      if (u.protocol === 'postgres:') u.protocol = 'postgresql:';

      // Neon pooled hosts need pgbouncer flag
      const isPooler =
        u.hostname.includes('-pooler') ||
        u.searchParams.get('pgbouncer') === 'true';

      if (isPooler) {
        u.searchParams.set('pgbouncer', 'true');
        // Single connection per Nest process avoids pooler churn / Closed errors
        if (!u.searchParams.has('connection_limit')) {
          u.searchParams.set('connection_limit', '1');
        }
        if (!u.searchParams.has('pool_timeout')) {
          u.searchParams.set('pool_timeout', '30');
        }
      }

      // SSL required for Neon; avoid channel_binding which breaks many Prisma paths
      if (!u.searchParams.has('sslmode')) {
        u.searchParams.set('sslmode', 'require');
      }
      u.searchParams.delete('channel_binding');

      // Reasonable connect timeout
      if (!u.searchParams.has('connect_timeout')) {
        u.searchParams.set('connect_timeout', '15');
      }

      return u.toString();
    } catch {
      return input;
    }
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (err) {
      this.logger.warn(`Prisma disconnect: ${(err as Error).message}`);
    }
  }

  /** Connect with retries — Neon free tier can briefly refuse cold starts. */
  async connectWithRetry(maxAttempts = 5): Promise<void> {
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.$connect();
          // Smoke query so we fail fast if auth/db is wrong
          await this.$queryRaw`SELECT 1`;
          this.logger.log('Database connected');
          return;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Database connect attempt ${attempt}/${maxAttempts} failed: ${msg}`,
          );
          try {
            await this.$disconnect();
          } catch {
            /* ignore */
          }
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1000));
          }
        }
      }
      this.logger.error(
        'Could not connect to PostgreSQL. Check DATABASE_URL (Neon pooler + pgbouncer=true, no channel_binding).',
      );
      throw lastErr;
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  /**
   * Run a DB operation; on connection-closed errors, reconnect once and retry.
   */
  async withReconnect<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (!PrismaService.isConnectionError(err)) throw err;
      this.logger.warn('Prisma connection lost — reconnecting…');
      try {
        await this.$disconnect();
      } catch {
        /* ignore */
      }
      await this.connectWithRetry(3);
      return fn();
    }
  }

  static isConnectionError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    return (
      code === 'P1001' ||
      code === 'P1002' ||
      code === 'P1017' ||
      /closed|connection|ECONNRESET|ECONNREFUSED|can't reach|Server has closed|kind: Closed/i.test(
        msg,
      )
    );
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );
    return Promise.all(
      models.map((modelKey) => {
        const model = (this as Record<string, unknown>)[modelKey as string] as
          | { deleteMany?: () => Promise<unknown> }
          | undefined;
        return model?.deleteMany?.();
      }),
    );
  }
}
