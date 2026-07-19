import { PrismaService } from '../../prisma/prisma.service';
export declare class NewsletterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    subscribe(email: string): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        subscribedAt: Date;
        unsubscribedAt: Date | null;
    }>;
    unsubscribe(email: string): Promise<{
        message: string;
    }>;
    list(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        email: string;
        isActive: boolean;
        subscribedAt: Date;
        unsubscribedAt: Date | null;
    }[]>;
}
