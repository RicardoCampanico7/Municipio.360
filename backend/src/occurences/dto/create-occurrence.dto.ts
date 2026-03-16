import { ArrayMaxSize, IsArray, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Representa os dados necessarios para criar uma nova ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O DTO deve garantir a presenca dos campos essenciais de uma ocorrencia.
 */
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
}
