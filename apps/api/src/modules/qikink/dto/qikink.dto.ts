import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class QikinkWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  event_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  order_id?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  order_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  awb?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tracking_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class QikinkDesignEntryDto {
  @IsString()
  placement!: string;

  @IsOptional()
  @IsString()
  designCode?: string;

  @IsString()
  designUrl!: string;

  @IsOptional()
  @IsString()
  mockupUrl?: string;
}

export class MapQikinkSkuDto {
  @IsOptional()
  @IsString()
  qikinkSku?: string;

  @IsOptional()
  qikinkPrintTypeId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QikinkDesignEntryDto)
  qikinkDesigns?: QikinkDesignEntryDto[];

  @IsOptional()
  qikinkSearchFromMyProducts?: number;
  }
