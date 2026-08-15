import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req as NestReq,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { QikinkService } from './qikink.service';
import { QikinkJobQueue } from './queue/qikink-job.queue';
import { QikinkJobType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MapQikinkSkuDto } from './dto/qikink.dto';

@ApiTags('qikink')
@Controller('qikink')
export class QikinkController {
  constructor(
    private readonly qikink: QikinkService,
    private readonly queue: QikinkJobQueue,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('webhooks')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Qikink fulfillment webhook receiver' })
  async webhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, unknown>,
    @NestReq() req: Request & { rawBody?: Buffer },
  ) {
    return this.qikink.handleWebhook(headers, req.rawBody, body);
  }

  @Get('health')
  @Public()
  health() {
    return {
      enabled: this.qikink.isEnabled(),
      autoSubmit: this.qikink.autoSubmitEnabled(),
    };
  }

  @Post('orders/:orderId/submit')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  submit(@Param('orderId') orderId: string) {
    return this.qikink.enqueueOrderSubmission(orderId, 'admin_manual');
  }

  @Post('orders/:orderId/retry')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  retry(@Param('orderId') orderId: string) {
    return this.qikink.adminRetry(orderId);
  }

  @Get('orders/:orderId')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  fulfillment(@Param('orderId') orderId: string) {
    return this.qikink.getOrderFulfillment(orderId);
  }

  @Post('orders/:orderId/sync-status')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  async syncStatus(@Param('orderId') orderId: string) {
    const job = await this.queue.enqueue(QikinkJobType.SYNC_ORDER_STATUS, { orderId });
    return { queued: true, jobId: job.id };
  }

  @Post('products/sync')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async syncProducts() {
    const job = await this.queue.enqueue(QikinkJobType.SYNC_PRODUCTS, {});
    // Also run immediately for admin UX
    const result = await this.qikink.syncProducts();
    return { jobId: job.id, result };
  }

  @Get('products/catalog')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  catalog() {
    return this.prisma.qikinkProductCatalog.findMany({
      orderBy: { lastSyncedAt: 'desc' },
      take: 200,
    });
  }

  @Get('logs')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  logs() {
    return this.prisma.qikinkApiLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('jobs')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  jobs() {
    return this.prisma.qikinkJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        order: {
          select: {
            orderNumber: true,
            qikinkOrderId: true,
            qikinkOrderNumber: true,
            qikinkSyncStatus: true,
          },
        },
      },
    });
  }

  @Patch('products/:productId/mapping')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  mapProduct(@Param('productId') productId: string, @Body() dto: MapQikinkSkuDto) {
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        qikinkSku: dto.qikinkSku,
        qikinkPrintTypeId: 1, // DTG only — fixed for all products
        qikinkDesigns: dto.qikinkDesigns as unknown as Prisma.InputJsonValue,
        qikinkSearchFromMyProducts: dto.qikinkSearchFromMyProducts,
      },
    });
  }

  @Patch('variants/:variantId/mapping')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  mapVariant(
    @Param('variantId') variantId: string,
    @Body() body: { qikinkSku?: string; qikinkPrice?: number },
  ) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        qikinkSku: body.qikinkSku,
        qikinkPrice: body.qikinkPrice,
      },
    });
  }
}
