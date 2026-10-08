import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        link: string | null;
        body: string;
        isRead: boolean;
    }[]>;
    markRead(userId: string, id: string): Promise<{
        message: string;
    }>;
    markAllRead(userId: string): Promise<{
        message: string;
    }>;
    create(userId: string, data: {
        type: NotificationType;
        title: string;
        body: string;
        link?: string;
    }): import(".prisma/client").Prisma.Prisma__NotificationClient<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        link: string | null;
        body: string;
        isRead: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    unreadCount(userId: string): import(".prisma/client").Prisma.PrismaPromise<number>;
}
