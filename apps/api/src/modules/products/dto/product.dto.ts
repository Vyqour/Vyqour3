import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ProductImageDto {
  @ApiProperty()
  @IsString()
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;
}

export class ProductVariantDto {
  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class QikinkDesignDto {
  @ApiProperty({ description: 'Print placement, e.g. "fr" (front), "bk" (back)' })
  @IsString()
  placement!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designCode?: string;

  @ApiProperty({ description: 'Print-ready design file URL sent to Qikink' })
  @IsString()
  designUrl!: string;

  @ApiPropertyOptional({ description: 'Internal reference mockup URL, never printed' })
  @IsOptional()
  @IsString()
  mockupUrl?: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectionId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materials?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'Qikink catalog SKU (My Products or SKU Description) used for fulfilment',
  })
  @IsOptional()
  @IsString()
  qikinkSku?: string;

  @ApiPropertyOptional({
    description: 'Qikink Print Type ID (see Qikink SKU catalog). Defaults to 1.',
  })
  @IsOptional()
  @IsNumber()
  qikinkPrintTypeId?: number;

  @ApiPropertyOptional({
    description:
      'Array of print placements (front/back/sleeve etc). Each item needs a print-ready designUrl (never shown to customers). Required when qikinkSearchFromMyProducts = 0.',
    type: [QikinkDesignDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QikinkDesignDto)
  qikinkDesigns?: QikinkDesignDto[];

  @ApiPropertyOptional({
    description:
      '1 = use existing Qikink catalog product/SKU (no custom design upload needed). 0 = custom design — requires qikinkDesignUrl.',
  })
  @IsOptional()
  @IsNumber()
  qikinkSearchFromMyProducts?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sizes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  featured?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newArrival?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bestSeller?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trending?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
  }
