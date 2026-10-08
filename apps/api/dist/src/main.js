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
const cors_util_1 = require("./common/utils/cors.util");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
        bodyParser: false,
    });
    const config = app.get(config_1.ConfigService);
    const logger = new common_1.Logger('Bootstrap');
    const prefix = (config.get('apiPrefix') || 'api/v1').replace(/^\/+|\/+$/g, '');
    app.setGlobalPrefix(prefix, {
        exclude: [],
    });
    const corsOrigins = config.get('corsOrigins') || ['http://localhost:3000'];
    const originDelegate = (0, cors_util_1.createCorsOriginDelegate)(corsOrigins);
    app.enableCors({
        origin: originDelegate,
        credentials: true,
        methods: cors_util_1.CORS_METHODS,
        allowedHeaders: cors_util_1.CORS_ALLOWED_HEADERS,
        exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
        maxAge: 86400,
    });
    app.use((req, res, next) => {
        if (req.method !== 'OPTIONS')
            return next();
        const requestOrigin = req.headers.origin;
        if (requestOrigin && (0, cors_util_1.isOriginAllowed)(requestOrigin, corsOrigins)) {
            res.header('Access-Control-Allow-Origin', requestOrigin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Vary', 'Origin');
            res.header('Access-Control-Allow-Methods', cors_util_1.CORS_METHODS.join(','));
            const reqHeaders = req.headers['access-control-request-headers'];
            res.header('Access-Control-Allow-Headers', typeof reqHeaders === 'string' && reqHeaders.length > 0
                ? reqHeaders
                : cors_util_1.CORS_ALLOWED_HEADERS.join(','));
            res.header('Access-Control-Max-Age', '86400');
            return res.status(204).end();
        }
        return next();
    });
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use(compression());
    app.use(cookieParser());
    const isWebhook = (req) => req.originalUrl?.includes('/webhooks/') || req.url?.includes('/webhooks/');
    app.use((req, res, next) => {
        if (req.method === 'OPTIONS')
            return next();
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
    await app.listen(port, '0.0.0.0');
    logger.log(`VYQOUR API running on http://0.0.0.0:${port}/${prefix}`);
    logger.log(`Swagger docs: http://localhost:${port}/${prefix}/docs`);
    logger.log(`CORS allowlist (+ localhost/Codespaces dynamic): ${corsOrigins.join(', ')}`);
    logger.log(`Qikink enabled=${config.get('qikink.enabled')} sandbox=${config.get('qikink.sandbox')}`);
}
bootstrap();
//# sourceMappingURL=main.js.map