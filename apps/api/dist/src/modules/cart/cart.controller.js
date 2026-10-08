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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cart_service_1 = require("./cart.service");
const cart_dto_1 = require("./dto/cart.dto");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let CartController = class CartController {
    constructor(cart) {
        this.cart = cart;
    }
    ids(user, sessionId) {
        return { userId: user?.id, sessionId: sessionId || undefined };
    }
    get(user, sessionId) {
        const { userId, sessionId: sid } = this.ids(user, sessionId);
        return this.cart.getCart(userId, sid);
    }
    add(dto, user, sessionId) {
        const { userId, sessionId: sid } = this.ids(user, sessionId);
        return this.cart.addItem(dto, userId, sid);
    }
    update(itemId, dto, user, sessionId) {
        const { userId, sessionId: sid } = this.ids(user, sessionId);
        return this.cart.updateItem(itemId, dto, userId, sid);
    }
    remove(itemId, user, sessionId) {
        const { userId, sessionId: sid } = this.ids(user, sessionId);
        return this.cart.removeItem(itemId, userId, sid);
    }
    clear(user, sessionId) {
        const { userId, sessionId: sid } = this.ids(user, sessionId);
        return this.cart.clear(userId, sid);
    }
    coupon(dto, user, sessionId) {
        const { userId, sessionId: sid } = this.ids(user, sessionId);
        return this.cart.applyCoupon(dto.code, userId, sid);
    }
    merge(user, sessionId) {
        return this.cart.mergeGuestCart(user.id, sessionId);
    }
};
exports.CartController = CartController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiHeader)({ name: 'x-session-id', required: false }),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "get", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('items'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cart_dto_1.AddToCartDto, Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "add", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Patch)('items/:itemId'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cart_dto_1.UpdateCartItemDto, Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "update", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Delete)('items/:itemId'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "remove", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Delete)(),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "clear", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('coupon'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cart_dto_1.ApplyCouponDto, Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "coupon", null);
__decorate([
    (0, common_1.Post)('merge'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "merge", null);
exports.CartController = CartController = __decorate([
    (0, swagger_1.ApiTags)('cart'),
    (0, common_1.Controller)('cart'),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], CartController);
//# sourceMappingURL=cart.controller.js.map