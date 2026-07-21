import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isOriginAllowed, parseCorsOrigins } from '../utils/cors.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Ensure error responses still carry CORS headers (some proxies strip middleware headers on 4xx/5xx)
    this.applyCorsHeaders(request, response);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) || message;
        error = (body.error as string) || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private applyCorsHeaders(request: Request, response: Response) {
    if (response.getHeader('Access-Control-Allow-Origin')) return;

    const origin = request.headers.origin as string | undefined;
    if (!origin) return;

    const fromEnv = parseCorsOrigins(process.env.CORS_ORIGINS);
    const webUrl = (process.env.WEB_URL || '').trim().replace(/\/+$/, '');
    const list = [
      ...fromEnv,
      webUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ].filter(Boolean);

    if (isOriginAllowed(origin, list)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
  }
}
