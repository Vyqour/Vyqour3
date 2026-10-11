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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let AddressesService = class AddressesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(userId) {
        return this.prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async create(userId, dto) {
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
                type: dto.type || client_1.AddressType.HOME,
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
    async update(userId, id, dto) {
        await this.ensureOwner(userId, id);
        if (dto.isDefault) {
            await this.prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        return this.prisma.address.update({ where: { id }, data: dto });
    }
    async remove(userId, id) {
        await this.ensureOwner(userId, id);
        await this.prisma.address.delete({ where: { id } });
        return { message: 'Address deleted' };
    }
    async ensureOwner(userId, id) {
        const addr = await this.prisma.address.findUnique({ where: { id } });
        if (!addr)
            throw new common_1.NotFoundException('Address not found');
        if (addr.userId !== userId)
            throw new common_1.ForbiddenException();
        return addr;
    }
};
exports.AddressesService = AddressesService;
exports.AddressesService = AddressesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AddressesService);
//# sourceMappingURL=addresses.service.js.map