import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, ApplyCouponDto, UpdateCartItemDto } from './dto/cart.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  private ids(user?: AuthUser, sessionId?: string) {
    return { userId: user?.id, sessionId: sessionId || undefined };
  }

  @Public()
  @Get()
  @ApiHeader({ name: 'x-session-id', required: false })
  @ApiBearerAuth()
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cart.getCart(userId, sid);
  }

  @Public()
  @Post('items')
  @ApiBearerAuth()
  add(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cart.addItem(dto, userId, sid);
  }

  @Public()
  @Patch('items/:itemId')
  @ApiBearerAuth()
  update(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cart.updateItem(itemId, dto, userId, sid);
  }

  @Public()
  @Delete('items/:itemId')
  @ApiBearerAuth()
  remove(
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cart.removeItem(itemId, userId, sid);
  }

  @Public()
  @Delete()
  @ApiBearerAuth()
  clear(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cart.clear(userId, sid);
  }

  @Public()
  @Post('coupon')
  @ApiBearerAuth()
  coupon(
    @Body() dto: ApplyCouponDto,
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cart.applyCoupon(dto.code, userId, sid);
  }

  @Post('merge')
  @ApiBearerAuth()
  merge(
    @CurrentUser() user: AuthUser,
    @Headers('x-session-id') sessionId: string,
  ) {
    return this.cart.mergeGuestCart(user.id, sessionId);
  }
}
