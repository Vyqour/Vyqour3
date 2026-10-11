import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class MediaService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private configured;
    constructor(config: ConfigService, prisma: PrismaService);
    upload(file: Express.Multer.File, folder?: string, uploadedBy?: string): Promise<{
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
