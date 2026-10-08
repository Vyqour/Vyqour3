import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
export declare class CollectionsController {
    private readonly collections;
    constructor(collections: CollectionsService);
    findAll(all?: string): Promise<any>;
    findOne(slug: string): Promise<any>;
    create(dto: CreateCollectionDto): Promise<any>;
    update(id: string, dto: UpdateCollectionDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
