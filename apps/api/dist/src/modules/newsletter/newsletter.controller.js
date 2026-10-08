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
exports.NewsletterController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const newsletter_service_1 = require("./newsletter.service");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
class SubscribeDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SubscribeDto.prototype, "email", void 0);
let NewsletterController = class NewsletterController {
    constructor(newsletter) {
        this.newsletter = newsletter;
    }
    subscribe(dto) {
        return this.newsletter.subscribe(dto.email);
    }
    unsubscribe(dto) {
        return this.newsletter.unsubscribe(dto.email);
    }
    list() {
        return this.newsletter.list();
    }
};
exports.NewsletterController = NewsletterController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('subscribe'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SubscribeDto]),
    __metadata("design:returntype", void 0)
], NewsletterController.prototype, "subscribe", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('unsubscribe'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SubscribeDto]),
    __metadata("design:returntype", void 0)
], NewsletterController.prototype, "unsubscribe", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NewsletterController.prototype, "list", null);
exports.NewsletterController = NewsletterController = __decorate([
    (0, swagger_1.ApiTags)('newsletter'),
    (0, common_1.Controller)('newsletter'),
    __metadata("design:paramtypes", [newsletter_service_1.NewsletterService])
], NewsletterController);
//# sourceMappingURL=newsletter.controller.js.map