import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail } from 'class-validator';
import { NewsletterService } from './newsletter.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

class SubscribeDto {
  @IsEmail() email!: string;
}

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto.email);
  }

  @Public()
  @Post('unsubscribe')
  unsubscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.unsubscribe(dto.email);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  list() {
    return this.newsletter.list();
  }
}
