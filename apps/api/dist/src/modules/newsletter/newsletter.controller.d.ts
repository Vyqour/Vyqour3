import { NewsletterService } from './newsletter.service';
declare class SubscribeDto {
    email: string;
}
export declare class NewsletterController {
    private readonly newsletter;
    constructor(newsletter: NewsletterService);
    subscribe(dto: SubscribeDto): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        subscribedAt: Date;
        unsubscribedAt: Date | null;
    }>;
    unsubscribe(dto: SubscribeDto): Promise<{
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
export {};
