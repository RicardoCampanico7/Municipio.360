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

const CATEGORY_ALIASES: Record<string, OccurrenceCategory> = {
  BURACOS_PAVIMENTO: OccurrenceCategory.BURACOS_PAVIMENTO,
  BURACOS_NO_PAVIMENTO: OccurrenceCategory.BURACOS_PAVIMENTO,
  BURACO_NA_ESTRADA: OccurrenceCategory.BURACOS_PAVIMENTO,
  ILUMINACAO_PUBLICA: OccurrenceCategory.ILUMINACAO_PUBLICA,
  LIMPEZA_URBANA: OccurrenceCategory.LIMPEZA_URBANA,
  RUIDO: OccurrenceCategory.RUIDO,
  ESPACOS_PUBLICOS: OccurrenceCategory.ESPACOS_PUBLICOS,
  SINALIZACAO: OccurrenceCategory.SINALIZACAO,
  OUTROS: OccurrenceCategory.OUTROS,
};

function normalizeCategoryAlias(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Representa os dados necessarios para criar uma nova ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 19/03/2026
 * @inv O DTO deve garantir a presenca dos campos essenciais de uma ocorrencia.
 */
export class CreateOccurrenceDto {
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    return CATEGORY_ALIASES[normalizeCategoryAlias(value)] ?? value;
  })
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
