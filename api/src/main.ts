import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { json, raw, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prefix = config.get<string>('apiPrefix') || 'api/v1';
  app.setGlobalPrefix(prefix);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());

  // Preserve raw body for webhook signature verification (Razorpay + Qikink)
  const isWebhook = (req: Request) =>
    req.originalUrl?.includes('/webhooks/') || req.url?.includes('/webhooks/');

  app.use((req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction) => {
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

  const origins = config.get<string[]>('corsOrigins') || ['http://localhost:3000'];
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
  await app.listen(port);
  logger.log(`VYQOUR API running on http://localhost:${port}/${prefix}`);
  logger.log(`Swagger docs: http://localhost:${port}/${prefix}/docs`);
  logger.log(`Qikink enabled=${config.get('qikink.enabled')} sandbox=${config.get('qikink.sandbox')}`);
}

bootstrap();
