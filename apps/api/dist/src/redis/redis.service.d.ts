import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisService implements OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private client;
    private enabled;
    constructor(config: ConfigService);
    onModuleDestroy(): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    delByPattern(pattern: string): Promise<void>;
}
