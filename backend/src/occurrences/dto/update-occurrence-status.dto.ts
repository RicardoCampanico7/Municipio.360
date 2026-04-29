import { ApiProperty } from '@nestjs/swagger';
import { OccurrenceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { OCCURRENCE_ERROR_MESSAGES } from '../constants/occurrence.constants';

/**
 * Representa o novo estado pretendido para uma ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O estado deve corresponder a um valor valido do enum OccurrenceStatus.
 */
export class UpdateOccurrenceStatusDto {
  @ApiProperty({
    enum: OccurrenceStatus,
    example: OccurrenceStatus.EM_TRATAMENTO,
    description: 'Novo estado da ocorrencia',
  })
  @IsEnum(OccurrenceStatus, {
    message: OCCURRENCE_ERROR_MESSAGES.invalidStatus,
  })
  status: OccurrenceStatus;
}
