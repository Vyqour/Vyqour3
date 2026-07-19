"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const express_1 = require("express");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
        bodyParser: false,
    });
    const config = app.get(config_1.ConfigService);
    const logger = new common_1.Logger('Bootstrap');
    const prefix = config.get('apiPrefix') || 'api/v1';
    app.setGlobalPrefix(prefix);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(compression());
    app.use(cookieParser());
    const isWebhook = (req) => req.originalUrl?.includes('/webhooks/') || req.url?.includes('/webhooks/');
    app.use((req, res, next) => {
        if (isWebhook(req)) {
            return (0, express_1.raw)({ type: '*/*', limit: '2mb' })(req, res, (err) => {
                if (err)
                    return next(err);
                if (Buffer.isBuffer(req.body)) {
                    req.rawBody = req.body;
                    try {
                        const text = req.body.toString('utf8');
                        req.body = text ? JSON.parse(text) : {};
                    }
                    catch {
                        req.body = {};
                    }
                }
                return next();
            });
        }
        return (0, express_1.json)({ limit: '2mb' })(req, res, next);
    });
    const origins = config.get('corsOrigins') || ['http://localhost:3000'];
    app.enableCors({
        origin: origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'x-session-id',
            'x-razorpay-signature',
            'x-qikink-signature',
            'x-signature',
        ],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const swagger = new swagger_1.DocumentBuilder()
        .setTitle('VYQOUR API')
        .setDescription('Premium Print-on-Demand Fashion Store API · Qikink + Razorpay')
        .setVersion('1.1')
        .addBearerAuth()
        .addCookieAuth('access_token')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swagger);
    swagger_1.SwaggerModule.setup(`${prefix}/docs`, app, document);
    const port = config.get('port') || 4000;
    await app.listen(port);
    logger.log(`VYQOUR API running on http://localhost:${port}/${prefix}`);
    logger.log(`Swagger docs: http://localhost:${port}/${prefix}/docs`);
    logger.log(`Qikink enabled=${config.get('qikink.enabled')} sandbox=${config.get('qikink.sandbox')}`);
}
bootstrap();
//# sourceMappingURL=main.js.map