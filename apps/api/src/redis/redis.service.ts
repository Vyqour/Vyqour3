import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private enabled = false;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('redisUrl');
    if (!url) {
      this.logger.warn('REDIS_URL not set — caching disabled');
      return;
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this.client.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
        this.enabled = false;
      });
      this.client
        .connect()
        .then(() => {
          this.enabled = true;
          this.logger.log('Redis connected');
        })
        .catch((err: Error) => {
          this.logger.warn(`Redis unavailable: ${err.message} — caching disabled`);
          this.enabled = false;
        });
    } catch (err) {
      this.logger.warn(`Redis init failed: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      /* ignore */
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      /* ignore */
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(...keys);
    } catch {
      /* ignore */
    }
  }
}
