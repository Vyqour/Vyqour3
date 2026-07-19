import { Body, Controller, Headers, Post, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

class VerifyPaymentDto {
  @IsString() orderId!: string;
  @IsString() razorpayOrderId!: string;
  @IsString() razorpayPaymentId!: string;
  @IsString() razorpaySignature!: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId/create')
  @ApiBearerAuth()
  create(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.payments.createPaymentOrder(orderId, user.id);
  }

  @Post('verify')
  @ApiBearerAuth()
  verify(@Body() dto: VerifyPaymentDto) {
    return this.payments.verifyPayment(dto);
  }

  @Public()
  @Post('webhooks/razorpay')
  @ApiExcludeEndpoint()
  razorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    return this.payments.handleRazorpayWebhook(signature, req.rawBody, body);
  }
}
