import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QikinkJobQueue } from './queue/qikink-job.queue';
import { QikinkService } from './qikink.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class QikinkWorker implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly queue;
    private readonly qikink;
    private readonly prisma;
    private readonly logger;
    private timer;
    private running;
    constructor(config: ConfigService, queue: QikinkJobQueue, qikink: QikinkService, prisma: PrismaService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private tick;
    pollOpenOrders(): Promise<void>;
}
