"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            datasources: {
                db: {
                    url: PrismaService_1.resolveDatabaseUrl(),
                },
            },
            log: process.env.NODE_ENV === 'development'
                ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
                : ['error'],
            errorFormat: 'pretty',
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
        this.connecting = null;
    }
    static resolveDatabaseUrl(raw) {
        const input = (raw || process.env.DATABASE_URL || '').trim();
        if (!input)
            return input;
        try {
            const u = new URL(input);
            if (u.protocol === 'postgres:')
                u.protocol = 'postgresql:';
            const isPooler = u.hostname.includes('-pooler') ||
                u.searchParams.get('pgbouncer') === 'true';
            if (isPooler) {
                u.searchParams.set('pgbouncer', 'true');
                if (!u.searchParams.has('connection_limit')) {
                    u.searchParams.set('connection_limit', '1');
                }
                if (!u.searchParams.has('pool_timeout')) {
                    u.searchParams.set('pool_timeout', '30');
                }
            }
            if (!u.searchParams.has('sslmode')) {
                u.searchParams.set('sslmode', 'require');
            }
            u.searchParams.delete('channel_binding');
            if (!u.searchParams.has('connect_timeout')) {
                u.searchParams.set('connect_timeout', '15');
            }
            return u.toString();
        }
        catch {
            return input;
        }
    }
    async onModuleInit() {
        await this.connectWithRetry();
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
        }
        catch (err) {
            this.logger.warn(`Prisma disconnect: ${err.message}`);
        }
    }
    async connectWithRetry(maxAttempts = 5) {
        if (this.connecting)
            return this.connecting;
        this.connecting = (async () => {
            let lastErr;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await this.$connect();
                    await this.$queryRaw `SELECT 1`;
                    this.logger.log('Database connected');
                    return;
                }
                catch (err) {
                    lastErr = err;
                    const msg = err instanceof Error ? err.message : String(err);
                    this.logger.error(`Database connect attempt ${attempt}/${maxAttempts} failed: ${msg}`);
                    try {
                        await this.$disconnect();
                    }
                    catch {
                    }
                    if (attempt < maxAttempts) {
                        await new Promise((r) => setTimeout(r, attempt * 1000));
                    }
                }
            }
            this.logger.error('Could not connect to PostgreSQL. Check DATABASE_URL (Neon pooler + pgbouncer=true, no channel_binding).');
            throw lastErr;
        })();
        try {
            await this.connecting;
        }
        finally {
            this.connecting = null;
        }
    }
    async withReconnect(fn) {
        try {
            return await fn();
        }
        catch (err) {
            if (!PrismaService_1.isConnectionError(err))
                throw err;
            this.logger.warn('Prisma connection lost — reconnecting…');
            try {
                await this.$disconnect();
            }
            catch {
            }
            await this.connectWithRetry(3);
            return fn();
        }
    }
    static isConnectionError(err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = err && typeof err === 'object' && 'code' in err
            ? String(err.code)
            : '';
        return (code === 'P1001' ||
            code === 'P1002' ||
            code === 'P1017' ||
            /closed|connection|ECONNRESET|ECONNREFUSED|can't reach|Server has closed|kind: Closed/i.test(msg));
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('cleanDatabase is not allowed in production');
        }
        const models = Reflect.ownKeys(this).filter((key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'));
        return Promise.all(models.map((modelKey) => {
            const model = this[modelKey];
            return model?.deleteMany?.();
        }));
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map