import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: any;
  let request: any;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = {
      statusCode: 0,
      body: undefined as any,
      getHeader: jest.fn(),
      setHeader: jest.fn(),
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.body = payload;
        return this;
      },
    };
    request = { url: '/api/v1/orders', headers: {} };
    host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  });

  it('preserves HttpException status and message (BadRequest)', () => {
    filter.catch(new BadRequestException('Coupon exhausted'), host);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Coupon exhausted');
    expect(response.body.success).toBe(false);
  });

  it('preserves HttpException message arrays from validation', () => {
    filter.catch(new NotFoundException(['code required', 'bad value']), host);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toEqual(['code required', 'bad value']);
  });

  it('returns a generic message for unexpected internal errors and never leaks details', () => {
    const rawError = new Error(
      'Invalid `prisma.order.create()` invocation: password=hunter2 host=db.internal',
    );
    rawError.stack = 'Error: password=hunter2\n    at Object.query (/app/node_modules/pg/lib/index.js:1)';

    filter.catch(rawError, host);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    // No stack trace, no raw database error text in the client response
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('node_modules');
    expect(serialized).not.toContain('at Object');
    expect(response.body.error).toBe('Internal Server Error');
  });

  it('returns a generic message for thrown non-Error values', () => {
    filter.catch({ secret: 'internal-token-abc' }, host);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(JSON.stringify(response.body)).not.toContain('internal-token-abc');
  });

  it('keeps existing CORS header behavior on error responses', () => {
    request.headers.origin = 'http://localhost:3000';

    filter.catch(new Error('boom'), host);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'http://localhost:3000',
    );
    expect(response.body.message).toBe('Internal server error');
  });
});
