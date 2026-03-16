import { OccurrenceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Representa o novo estado pretendido para uma ocorrencia.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O estado deve corresponder a um valor valido do enum OccurrenceStatus.
 */
export class UpdateOccurrenceStatusDto {
  @IsEnum(OccurrenceStatus)
  status: OccurrenceStatus;
}
