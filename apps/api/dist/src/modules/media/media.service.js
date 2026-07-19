"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const prisma_service_1 = require("../../prisma/prisma.service");
let MediaService = MediaService_1 = class MediaService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(MediaService_1.name);
        this.configured = false;
        const cloudName = this.config.get('cloudinary.cloudName');
        const apiKey = this.config.get('cloudinary.apiKey');
        const apiSecret = this.config.get('cloudinary.apiSecret');
        if (cloudName && apiKey && apiSecret) {
            cloudinary_1.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
            this.configured = true;
        }
        else {
            this.logger.warn('Cloudinary not configured — media uploads will use placeholder URLs');
        }
    }
    async upload(file, folder = 'vyqour', uploadedBy) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        if (!this.configured) {
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
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: 'auto' }, (err, res) => {
                if (err || !res)
                    reject(err || new Error('Upload failed'));
                else
                    resolve(res);
            });
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
    list(folder) {
        return this.prisma.media.findMany({
            where: folder ? { folder } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async remove(id) {
        const media = await this.prisma.media.findUnique({ where: { id } });
        if (!media)
            return { message: 'Not found' };
        if (media.publicId && this.configured) {
            await cloudinary_1.v2.uploader.destroy(media.publicId).catch(() => undefined);
        }
        await this.prisma.media.delete({ where: { id } });
        return { message: 'Deleted' };
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MediaService);
//# sourceMappingURL=media.service.js.map