"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = require("./config/configuration");
const validation_1 = require("./config/validation");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const mail_module_1 = require("./mail/mail.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const products_module_1 = require("./modules/products/products.module");
const categories_module_1 = require("./modules/categories/categories.module");
const cart_module_1 = require("./modules/cart/cart.module");
const wishlist_module_1 = require("./modules/wishlist/wishlist.module");
const orders_module_1 = require("./modules/orders/orders.module");
const addresses_module_1 = require("./modules/addresses/addresses.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const coupons_module_1 = require("./modules/coupons/coupons.module");
const admin_module_1 = require("./modules/admin/admin.module");
const blog_module_1 = require("./modules/blog/blog.module");
const newsletter_module_1 = require("./modules/newsletter/newsletter.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const media_module_1 = require("./modules/media/media.module");
const payments_module_1 = require("./modules/payments/payments.module");
const health_module_1 = require("./modules/health/health.module");
const qikink_module_1 = require("./modules/qikink/qikink.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
                validate: validation_1.validate,
            }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60_000,
                    limit: 120,
                },
            ]),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            mail_module_1.MailModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            products_module_1.ProductsModule,
            categories_module_1.CategoriesModule,
            cart_module_1.CartModule,
            wishlist_module_1.WishlistModule,
            orders_module_1.OrdersModule,
            addresses_module_1.AddressesModule,
            reviews_module_1.ReviewsModule,
            coupons_module_1.CouponsModule,
            admin_module_1.AdminModule,
            blog_module_1.BlogModule,
            newsletter_module_1.NewsletterModule,
            notifications_module_1.NotificationsModule,
            media_module_1.MediaModule,
            payments_module_1.PaymentsModule,
            qikink_module_1.QikinkModule,
            health_module_1.HealthModule,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.AllExceptionsFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: transform_interceptor_1.TransformInterceptor },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map