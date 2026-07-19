import { AddressType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export type AddressInput = {
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
};
export declare class AddressesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    create(userId: string, dto: AddressInput): Promise<{
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
    update(userId: string, id: string, dto: Partial<AddressInput>): Promise<{
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
    remove(userId: string, id: string): Promise<{
        message: string;
    }>;
    private ensureOwner;
}
