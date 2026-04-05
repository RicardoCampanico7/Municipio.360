import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Representa os dados necessarios para criar um comentario interno numa ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 05/04/2026
 * @inv O comentario interno deve conter texto com conteudo minimo.
 */
export class CreateOccurrenceInternalCommentDto {
  @ApiProperty({
    example: 'Equipa de manutencao notificada para verificacao no local.',
    description: 'Conteudo do comentario interno',
    minLength: 1,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  declare content: string;
}
