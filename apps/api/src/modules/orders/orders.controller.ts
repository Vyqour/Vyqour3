import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiBearerAuth()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  mine(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.orders.findMyOrders(user.id, query);
  }

  @Public()
  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string, @Query('email') email?: string) {
    return this.orders.track(orderNumber, email);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  adminAll(@Query() query: OrderQueryDto) {
    return this.orders.adminList(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  one(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const admin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(user.role);
    return this.orders.findOne(id, user.id, admin);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reason?: string },
  ) {
    return this.orders.cancel(id, user.id, body.reason);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
  status(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.updateStatus(id, dto, user.id);
  }
}
