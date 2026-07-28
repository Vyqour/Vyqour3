import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ContactService } from './contact.service';
import { Public } from '../../common/decorators/public.decorator';

class ContactDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(150) subject!: string;
  @IsString() @MinLength(5) @MaxLength(4000) message!: string;
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  submit(@Body() dto: ContactDto) {
    return this.contact.submit(dto);
  }
}
