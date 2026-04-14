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
  @IsEnum(OccurrenceCategory)
  declare category: OccurrenceCategory;

  @ApiPropertyOptional({
    example: 'Sinalizacao vertical danificada',
    description: 'Detalhe obrigatorio quando a categoria e OUTROS',
    minLength: 3,
  })
  @ValidateIf(
    (dto: CreateOccurrenceDto) => dto.category === OccurrenceCategory.OUTROS,
  )
  @IsString()
  @MinLength(3)
  declare otherCategoryDetail?: string;

  @ApiPropertyOptional({
    example: 'O candeeiro esta apagado ha 3 dias.',
    description: 'Descricao livre da ocorrencia',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  declare description?: string;

  @ApiProperty({
    example: 'Rua da Escola, junto ao numero 12',
    description: 'Localizacao textual da ocorrencia',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  declare location: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['http://localhost:3000/uploads/occurrences/exemplo.jpg'],
    description:
      'Lista opcional de URLs publicas previamente carregadas ou nomes enviados pelo multipart/form-data',
    maxItems: 3,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  declare imageUrls?: string[];
}
