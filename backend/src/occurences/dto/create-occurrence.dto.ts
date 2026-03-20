import { Transform } from 'class-transformer';
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
 * @version 19/03/2026
 * @inv O DTO deve garantir a presenca dos campos essenciais de uma ocorrencia.
 */
export class CreateOccurrenceDto {
  @IsEnum(OccurrenceCategory)
  declare category: OccurrenceCategory;

  @ValidateIf((dto: CreateOccurrenceDto) => dto.category === OccurrenceCategory.OUTROS)
  @IsString()
  @MinLength(3)
  declare otherCategoryDetail?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  declare description?: string;

  @IsString()
  @MinLength(2)
  declare location: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  declare imageUrls?: string[];
}
