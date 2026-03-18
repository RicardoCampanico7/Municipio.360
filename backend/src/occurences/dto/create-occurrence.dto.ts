import { OccurrenceCategory } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Representa os dados necessarios para criar uma nova ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O DTO deve garantir a presenca dos campos essenciais de uma ocorrencia.
 */
export class CreateOccurrenceDto {
  @IsEnum(OccurrenceCategory)
  category: OccurrenceCategory;

  @ValidateIf((dto: CreateOccurrenceDto) => dto.category === OccurrenceCategory.OUTROS)
  @IsString()
  @MinLength(3)
  otherCategoryDetail?: string;

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
}
