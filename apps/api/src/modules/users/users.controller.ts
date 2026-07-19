import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsEnum, IsOptional, IsString } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}

class UpdateRoleDto {
  @IsEnum(Role) role!: Role;
}

class UpdateStatusDto {
  @IsEnum(UserStatus) status!: UserStatus;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Delete('me')
  deleteMe(@CurrentUser() user: AuthUser) {
    return this.users.deleteAccount(user.id);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.users.adminList({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search,
      role,
    });
  }

  @Patch('admin/:id/role')
  @Roles(Role.SUPER_ADMIN)
  role(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.users.adminUpdateRole(id, dto.role);
  }

  @Patch('admin/:id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  status(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.users.adminUpdateStatus(id, dto.status);
  }
}
