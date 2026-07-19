import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: AddressInput) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    const count = await this.prisma.address.count({ where: { userId } });
    return this.prisma.address.create({
      data: {
        userId,
        type: dto.type || AddressType.HOME,
        fullName: dto.fullName,
        phone: dto.phone,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'India',
        isDefault: dto.isDefault ?? count === 0,
      },
    });
  }

  async update(userId: string, id: string, dto: Partial<AddressInput>) {
    await this.ensureOwner(userId, id);
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwner(userId, id);
    await this.prisma.address.delete({ where: { id } });
    return { message: 'Address deleted' };
  }

  private async ensureOwner(userId: string, id: string) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr) throw new NotFoundException('Address not found');
    if (addr.userId !== userId) throw new ForbiddenException();
    return addr;
  }
}
