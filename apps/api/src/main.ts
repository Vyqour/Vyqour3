import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { json, raw, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import {
  CORS_ALLOWED_HEADERS,
  CORS_METHODS,
  createCorsOriginDelegate,
  isOriginAllowed,
} from './common/utils/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prefix = (config.get<string>('apiPrefix') || 'api/v1').replace(/^\/+|\/+$/g, '');
  // Global prefix must NOT swallow OPTIONS preflight — Nest handles OPTIONS via CORS middleware.
  app.setGlobalPrefix(prefix, {
    exclude: [],
  });

  const corsOrigins = config.get<string[]>('corsOrigins') || ['http://localhost:3000'];
  const originDelegate = createCorsOriginDelegate(corsOrigins);

  // 1) CORS first so preflight always gets headers even if later middleware errors.
  app.enableCors({
    origin: originDelegate,
    credentials: true,
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  // Explicit early OPTIONS short-circuit (belt + suspenders for Codespaces proxies).
  // Runs at Express level before guards / pipes / interceptors.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'OPTIONS') return next();

    const requestOrigin = req.headers.origin as string | undefined;
    if (requestOrigin && isOriginAllowed(requestOrigin, corsOrigins)) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', CORS_METHODS.join(','));
      const reqHeaders = req.headers['access-control-request-headers'];
      res.header(
        'Access-Control-Allow-Headers',
        typeof reqHeaders === 'string' && reqHeaders.length > 0
          ? reqHeaders
          : CORS_ALLOWED_HEADERS.join(','),
      );
      res.header('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
    // Let Nest CORS middleware handle / reject
    return next();
  });

  // Helmet after CORS. Keep CORP cross-origin so browser can read API responses from web origin.
  // Disable helmet's default COOP/COEP that can interfere with cross-origin credentialed fetches in some previews.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      // contentSecurityPolicy is for HTML docs; API JSON is fine with defaults
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Preserve raw body for webhook signature verification (Razorpay + Qikink)
  const isWebhook = (req: Request) =>
    req.originalUrl?.includes('/webhooks/') || req.url?.includes('/webhooks/');

  app.use((req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction) => {
    // OPTIONS never has a body — skip parsers entirely
    if (req.method === 'OPTIONS') return next();

    if (isWebhook(req)) {
      return raw({ type: '*/*', limit: '2mb' })(req, res, (err) => {
        if (err) return next(err);
        if (Buffer.isBuffer(req.body)) {
          req.rawBody = req.body;
          try {
            const text = req.body.toString('utf8');
            req.body = text ? JSON.parse(text) : {};
          } catch {
            req.body = {};
          }
        }
        return next();
      });
    }
    return json({ limit: '2mb' })(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('VYQOUR API')
    .setDescription('Premium Print-on-Demand Fashion Store API · Qikink + Razorpay')
    .setVersion('1.1')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = config.get<number>('port') || 4000;
  // Listen on 0.0.0.0 so Codespaces port forwarding can reach the process
  await app.listen(port, '0.0.0.0');
  logger.log(`VYQOUR API running on http://0.0.0.0:${port}/${prefix}`);
  logger.log(`Swagger docs: http://localhost:${port}/${prefix}/docs`);
  logger.log(`CORS allowlist (+ localhost/Codespaces dynamic): ${corsOrigins.join(', ')}`);
  logger.log(
    `Qikink enabled=${config.get('qikink.enabled')} sandbox=${config.get('qikink.sandbox')}`,
  );
}

bootstrap();
