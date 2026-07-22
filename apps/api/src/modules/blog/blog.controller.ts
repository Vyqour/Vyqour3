import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { BlogService } from './blog.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreatePostDto {
  @IsString() title!: string;
  @IsString() content!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Public()
  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.blog.list(page ? +page : 1, limit ? +limit : 9, true);
  }

  // Static admin path MUST be registered before :slug or it is captured as a slug
  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminAll(@Query('page') page?: string) {
    return this.blog.list(page ? +page : 1, 20, false);
  }

  @Public()
  @Get(':slug')
  one(@Param('slug') slug: string) {
    return this.blog.bySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.blog.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreatePostDto>) {
    return this.blog.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
