import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private connecting;
    constructor();
    static resolveDatabaseUrl(raw?: string): string;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    connectWithRetry(maxAttempts?: number): Promise<void>;
    withReconnect<T>(fn: () => Promise<T>): Promise<T>;
    static isConnectionError(err: unknown): boolean;
    cleanDatabase(): Promise<unknown[]>;
}
