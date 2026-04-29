import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OccurrenceCategory } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { OCCURRENCE_ERROR_MESSAGES } from '../constants/occurrence.constants';

/**
 * Representa os dados editaveis de uma ocorrencia em contexto interno.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 06/04/2026
 * @inv A categoria e a localizacao devem existir sempre no pedido de edicao.
 * @inv O detalhe de categoria alternativa so pode permanecer preenchido quando a categoria e OUTROS.
 */
export class UpdateOccurrenceDto {
  @ApiProperty({
    enum: OccurrenceCategory,
    example: OccurrenceCategory.OUTROS,
    description: 'Categoria principal da ocorrencia',
  })
  @IsEnum(OccurrenceCategory, {
    message: OCCURRENCE_ERROR_MESSAGES.invalidCategory,
  })
  declare category: OccurrenceCategory;

  @ApiPropertyOptional({
    example: 'Passadeira apagada',
    description: 'Detalhe obrigatorio quando a categoria e OUTROS',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (dto: UpdateOccurrenceDto) => dto.category === OccurrenceCategory.OUTROS,
  )
  @IsString({ message: OCCURRENCE_ERROR_MESSAGES.invalidText })
  @IsNotEmpty({ message: OCCURRENCE_ERROR_MESSAGES.otherCategoryRequired })
  declare otherCategoryDetail?: string;

  @ApiProperty({
    example: 'Avenida Central, Faro',
    description: 'Localizacao textual da ocorrencia',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: OCCURRENCE_ERROR_MESSAGES.locationRequired })
  @IsNotEmpty({ message: OCCURRENCE_ERROR_MESSAGES.locationRequired })
  declare location: string;

  @ApiPropertyOptional({
    example: 'Sinal partido junto a escola',
    description: 'Descricao livre da ocorrencia',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: OCCURRENCE_ERROR_MESSAGES.invalidText })
  declare description?: string;
}
