import { NotificationsService } from './notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class NotificationsController {
    private readonly notifications;
    constructor(notifications: NotificationsService);
    list(user: AuthUser): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        link: string | null;
        body: string;
        isRead: boolean;
    }[]>;
    unread(user: AuthUser): Promise<{
        count: number;
    }>;
    read(user: AuthUser, id: string): Promise<{
        message: string;
    }>;
    readAll(user: AuthUser): Promise<{
        message: string;
    }>;
}
