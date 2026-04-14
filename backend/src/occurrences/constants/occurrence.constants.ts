import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';

export const INLINE_IMAGE_DATA_URL_PREFIX =
  /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

export const OCCURRENCE_CATEGORY_LABELS: Record<
  OccurrenceCategory,
  string
> = {
  [OccurrenceCategory.BURACOS_PAVIMENTO]: 'Buracos no pavimento',
  [OccurrenceCategory.ILUMINACAO_PUBLICA]: 'Iluminacao publica',
  [OccurrenceCategory.LIMPEZA_URBANA]: 'Limpeza urbana',
  [OccurrenceCategory.RUIDO]: 'Ruido',
  [OccurrenceCategory.ESPACOS_PUBLICOS]: 'Espacos publicos',
  [OccurrenceCategory.SINALIZACAO]: 'Sinalizacao',
  [OccurrenceCategory.OUTROS]: 'Outros',
};

export const ALLOWED_STATUS_TRANSITIONS: Record<
  OccurrenceStatus,
  readonly OccurrenceStatus[]
> = {
  [OccurrenceStatus.SUBMETIDA]: [
    OccurrenceStatus.EM_TRATAMENTO,
    OccurrenceStatus.CONCLUIDA,
  ],
  [OccurrenceStatus.EM_TRATAMENTO]: [OccurrenceStatus.CONCLUIDA],
  [OccurrenceStatus.CONCLUIDA]: [],
};
