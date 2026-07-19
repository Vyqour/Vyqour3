import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private configured = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const cloudName = this.config.get<string>('cloudinary.cloudName');
    const apiKey = this.config.get<string>('cloudinary.apiKey');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configured = true;
    } else {
      this.logger.warn('Cloudinary not configured — media uploads will use placeholder URLs');
    }
  }

  async upload(
    file: Express.Multer.File,
    folder = 'vyqour',
    uploadedBy?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    if (!this.configured) {
      // Dev fallback: store metadata with a data-less placeholder
      const url = `https://placehold.co/800x1000/0B0B0B/5B21B6?text=${encodeURIComponent(file.originalname)}`;
      return this.prisma.media.create({
        data: {
          url,
          filename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          folder,
          uploadedBy,
        },
      });
    }

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
      bytes: number;
      width?: number;
      height?: number;
      format: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, res) => {
          if (err || !res) reject(err || new Error('Upload failed'));
          else resolve(res as typeof result extends Promise<infer R> ? R : never);
        },
      );
      stream.end(file.buffer);
    });

    return this.prisma.media.create({
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: result.bytes,
        width: result.width,
        height: result.height,
        folder,
        uploadedBy,
      },
    });
  }

  list(folder?: string) {
    return this.prisma.media.findMany({
      where: folder ? { folder } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) return { message: 'Not found' };
    if (media.publicId && this.configured) {
      await cloudinary.uploader.destroy(media.publicId).catch(() => undefined);
    }
    await this.prisma.media.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
