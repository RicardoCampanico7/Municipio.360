import { IsEnum } from 'class-validator';
import { OccurrenceStatus } from '@prisma/client';

export class UpdateOccurrenceStatusDto {
  @IsEnum(OccurrenceStatus)
  status: OccurrenceStatus;
}