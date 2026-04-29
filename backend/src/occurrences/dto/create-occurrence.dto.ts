import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { OCCURRENCE_ERROR_MESSAGES } from '../constants/occurrence.constants';

function trimStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptionalStringValue(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? undefined : trimmedValue;
}

function normalizeOptionalStringArray(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return undefined;
    }

    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsedValue: unknown = JSON.parse(trimmedValue);

        if (Array.isArray(parsedValue)) {
          const normalizedValues = parsedValue
            .map((item) => trimOptionalStringValue(item))
            .filter(
              (item): item is string => typeof item === 'string' && item.length > 0,
            );

          return normalizedValues.length ? normalizedValues : undefined;
        }
      } catch {
        // Mantem compatibilidade com clientes que enviam apenas uma string simples.
      }
    }

    return [trimmedValue];
  }

  if (Array.isArray(value)) {
    const normalizedValues = value
      .map((item) => trimOptionalStringValue(item))
      .filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      );

    return normalizedValues.length ? normalizedValues : undefined;
  }

  return value;
}

/**
 * Representa os dados necessarios para criar uma nova ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 19/03/2026
 * @inv O DTO deve garantir a presenca dos campos essenciais de uma ocorrencia.
 */
export class CreateOccurrenceDto {
  @ApiProperty({
    enum: OccurrenceCategory,
    example: OccurrenceCategory.ILUMINACAO_PUBLICA,
    description: 'Categoria principal da ocorrencia',
  })
  @IsEnum(OccurrenceCategory, {
    message: OCCURRENCE_ERROR_MESSAGES.invalidCategory,
  })
  declare category: OccurrenceCategory;

  @ApiPropertyOptional({
    example: 'Sinalizacao vertical danificada',
    description: 'Detalhe obrigatorio quando a categoria e OUTROS',
    minLength: 3,
  })
  @ValidateIf(
    (dto: CreateOccurrenceDto) => dto.category === OccurrenceCategory.OUTROS,
  )
  @Transform(({ value }) => trimOptionalStringValue(value))
  @IsString({ message: OCCURRENCE_ERROR_MESSAGES.invalidText })
  @MinLength(3, {
    message: OCCURRENCE_ERROR_MESSAGES.otherCategoryRequired,
  })
  declare otherCategoryDetail?: string;

  @ApiPropertyOptional({
    example: 'O candeeiro esta apagado ha 3 dias.',
    description: 'Descricao livre da ocorrencia',
    minLength: 3,
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalStringValue(value))
  @IsString({ message: OCCURRENCE_ERROR_MESSAGES.invalidText })
  @MinLength(3, {
    message: 'A descricao da ocorrencia deve ter pelo menos 3 caracteres',
  })
  declare description?: string;

  @ApiProperty({
    example: 'Rua da Escola, junto ao numero 12',
    description: 'Localizacao textual da ocorrencia',
    minLength: 2,
  })
  @Transform(({ value }) => trimStringValue(value))
  @IsString({ message: OCCURRENCE_ERROR_MESSAGES.locationRequired })
  @MinLength(2, { message: OCCURRENCE_ERROR_MESSAGES.locationRequired })
  declare location: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['/uploads/occurrences/exemplo.jpg'],
    description:
      'Lista opcional de URLs publicas previamente carregadas pelo endpoint POST /occurrences/images',
    maxItems: 3,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalStringArray(value))
  @IsArray({ message: 'As imagens devem ser enviadas numa lista' })
  @ArrayMaxSize(3, { message: OCCURRENCE_ERROR_MESSAGES.maxImages(3) })
  @IsString({
    each: true,
    message: 'As imagens devem ser URLs publicas validas',
  })
  declare uploadedImageUrls?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['/uploads/occurrences/exemplo.jpg'],
    description:
      'Alias legado para URLs publicas previamente carregadas. Em novos clientes use uploadedImageUrls; em multipart/form-data o campo imageUrls e reservado aos ficheiros.',
    maxItems: 3,
    deprecated: true,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalStringArray(value))
  @IsArray({ message: 'As imagens devem ser enviadas numa lista' })
  @ArrayMaxSize(3, { message: OCCURRENCE_ERROR_MESSAGES.maxImages(3) })
  @IsString({
    each: true,
    message: 'As imagens devem ser URLs publicas validas',
  })
  declare imageUrls?: string[];
}
