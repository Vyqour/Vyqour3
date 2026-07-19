import { MediaService } from './media.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class MediaController {
    private readonly media;
    constructor(media: MediaService);
    upload(file: Express.Multer.File, folder: string, user: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        url: string;
        publicId: string | null;
        alt: string | null;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        width: number | null;
        height: number | null;
        folder: string | null;
        uploadedBy: string | null;
    }>;
    list(folder?: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        url: string;
        publicId: string | null;
        alt: string | null;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        width: number | null;
        height: number | null;
        folder: string | null;
        uploadedBy: string | null;
    }[]>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
