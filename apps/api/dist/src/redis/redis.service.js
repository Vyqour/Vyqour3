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
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RedisService_1.name);
        this.client = null;
        this.enabled = false;
        const url = this.config.get('redisUrl');
        if (!url) {
            this.logger.warn('REDIS_URL not set — caching disabled');
            return;
        }
        try {
            this.client = new ioredis_1.default(url, {
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
                .catch((err) => {
                this.logger.warn(`Redis unavailable: ${err.message} — caching disabled`);
                this.enabled = false;
            });
        }
        catch (err) {
            this.logger.warn(`Redis init failed: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        if (this.client)
            await this.client.quit().catch(() => undefined);
    }
    async get(key) {
        if (!this.enabled || !this.client)
            return null;
        try {
            const raw = await this.client.get(key);
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttlSeconds = 300) {
        if (!this.enabled || !this.client)
            return;
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        }
        catch {
        }
    }
    async del(key) {
        if (!this.enabled || !this.client)
            return;
        try {
            await this.client.del(key);
        }
        catch {
        }
    }
    async delByPattern(pattern) {
        if (!this.enabled || !this.client)
            return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length)
                await this.client.del(...keys);
        }
        catch {
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map