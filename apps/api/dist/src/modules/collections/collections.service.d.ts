import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
export declare class CollectionsService {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    findAll(includeInactive?: boolean): Promise<any>;
    findBySlug(slug: string): Promise<any>;
    create(dto: CreateCollectionDto): Promise<any>;
    update(id: string, dto: UpdateCollectionDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
    private ensureExists;
}
