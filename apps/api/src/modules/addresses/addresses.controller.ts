import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AddressType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AddressesService } from './addresses.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class AddressDto {
  @IsOptional() @IsEnum(AddressType) type?: AddressType;
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @IsString() postalCode!: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.addresses.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) {
    return this.addresses.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: Partial<AddressDto>) {
    return this.addresses.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addresses.remove(user.id, id);
  }
}
