import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CouponType, Role } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CouponsService } from './coupons.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

class CreateCouponDto {
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(CouponType) type!: CouponType;
  @IsNumber() value!: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsNumber() maxDiscount?: number;
  @IsOptional() @IsNumber() usageLimit?: number;
  @IsOptional() @IsNumber() perUserLimit?: number;
  @IsString() startsAt!: string;
  @IsString() expiresAt!: string;
}

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Public()
  @Get('validate/:code')
  validate(@Param('code') code: string, @Query('subtotal') subtotal: string) {
    return this.coupons.validate(code, parseFloat(subtotal || '0'));
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.coupons.list(page ? +page : 1, limit ? +limit : 20);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.coupons.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
