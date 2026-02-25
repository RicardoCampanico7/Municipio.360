import { IsArray, IsEnum, IsOptional, IsString, MinLength, ArrayMaxSize } from 'class-validator';
import { OccurrenceStatus } from '@prisma/client';

export class CreateOccurrenceDto {
  @IsString()
  @MinLength(2)
  category: string;

  @IsString()
  @MinLength(3)
  description: string;

  @IsString()
  @MinLength(2)
  location: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsEnum(OccurrenceStatus)
  status?: OccurrenceStatus;
}