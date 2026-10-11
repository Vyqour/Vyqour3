import { AddressType } from '@prisma/client';
import { AddressesService } from './addresses.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class AddressDto {
    type?: AddressType;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
}
export declare class AddressesController {
    private readonly addresses;
    constructor(addresses: AddressesService);
    list(user: AuthUser): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.AddressType;
        fullName: string;
        line1: string;
        line2: string | null;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        isDefault: boolean;
    }[]>;
    create(user: AuthUser, dto: AddressDto): Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.AddressType;
        fullName: string;
        line1: string;
        line2: string | null;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        isDefault: boolean;
    }>;
    update(user: AuthUser, id: string, dto: Partial<AddressDto>): Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.AddressType;
        fullName: string;
        line1: string;
        line2: string | null;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        isDefault: boolean;
    }>;
    remove(user: AuthUser, id: string): Promise<{
        message: string;
    }>;
}
export {};
