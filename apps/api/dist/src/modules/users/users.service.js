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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const client_1 = require("@prisma/client");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateProfile(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                role: true,
                emailVerified: true,
            },
        });
    }
    async deleteAccount(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                status: client_1.UserStatus.DELETED,
                deletedAt: new Date(),
                email: `deleted+${userId}@vyqour.invalid`,
                passwordHash: null,
                googleId: null,
            },
        });
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
        return { message: 'Account deleted' };
    }
    async adminList(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const where = { status: { not: client_1.UserStatus.DELETED } };
        if (query.role)
            where.role = query.role;
        if (query.search) {
            where.OR = [
                { email: { contains: query.search, mode: 'insensitive' } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    status: true,
                    emailVerified: true,
                    createdAt: true,
                    lastLoginAt: true,
                    _count: { select: { orders: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.user.count({ where }),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async adminUpdateRole(id, role) {
        if (role === client_1.Role.SUPER_ADMIN)
            throw new common_1.BadRequestException('Cannot assign SUPER_ADMIN');
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, email: true, role: true, status: true },
        });
    }
    async adminUpdateStatus(id, status) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.user.update({
            where: { id },
            data: { status },
            select: { id: true, email: true, role: true, status: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map