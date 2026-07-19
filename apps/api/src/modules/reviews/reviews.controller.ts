import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReviewsService } from './reviews.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() title?: string;
  @IsString() body!: string;
  @IsOptional() @IsArray() images?: string[];
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  list(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.listForProduct(productId, page ? +page : 1, limit ? +limit : 10);
  }

  @Post('product/:productId')
  @ApiBearerAuth()
  create(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.id, productId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const admin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    return this.reviews.remove(user.id, id, admin);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reviews.adminList(page ? +page : 1, limit ? +limit : 20);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  moderate(@Param('id') id: string, @Body() body: { isApproved: boolean }) {
    return this.reviews.moderate(id, body.isApproved);
  }
}
