import { Transform } from 'class-transformer';
import { OccurrenceCategory } from '@prisma/client';
import {
  ArrayMinSize,
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
  'Buracos no Pavimento': OccurrenceCategory.BURACOS_PAVIMENTO,
  ILUMINACAO_PUBLICA: OccurrenceCategory.ILUMINACAO_PUBLICA,
  'Iluminação pública': OccurrenceCategory.ILUMINACAO_PUBLICA,
  LIMPEZA_URBANA: OccurrenceCategory.LIMPEZA_URBANA,
  'Limpeza urbana': OccurrenceCategory.LIMPEZA_URBANA,
  RUIDO: OccurrenceCategory.RUIDO,
  'Ruído': OccurrenceCategory.RUIDO,
  ESPACOS_PUBLICOS: OccurrenceCategory.ESPACOS_PUBLICOS,
  'Espaços públicos': OccurrenceCategory.ESPACOS_PUBLICOS,
  SINALIZACAO: OccurrenceCategory.SINALIZACAO,
  'Sinalização': OccurrenceCategory.SINALIZACAO,
  OUTROS: OccurrenceCategory.OUTROS,
  'Outros': OccurrenceCategory.OUTROS,
};

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

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsString()
  @MinLength(2)
  location: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  imageUrls: string[];
}
