import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';

export const INLINE_IMAGE_DATA_URL_PREFIX =
  /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

export const OCCURRENCE_ERROR_MESSAGES = {
  occurrenceNotFound: 'Ocorrencia nao encontrada',
  occurrenceNotOwned: 'A ocorrencia nao pertence ao utilizador autenticado',
  invalidAuthenticatedUser: 'Utilizador autenticado invalido',
  accountNotCertified:
    'A conta precisa de estar certificada para criar ocorrencias',
  invalidCategory: 'A categoria da ocorrencia e invalida',
  invalidStatus: 'O estado da ocorrencia e invalido',
  invalidText: 'O campo deve ser texto',
  invalidStatusTransition: (
    currentStatus: OccurrenceStatus,
    nextStatus: OccurrenceStatus,
  ) =>
    `Transicao de estado invalida: ${currentStatus} -> ${nextStatus}`,
  duplicateImage: 'Nao pode repetir a mesma fotografia na ocorrencia',
  inlineImage:
    'As fotografias devem ser enviadas como ficheiros em multipart/form-data',
  invalidImageFormat: (index: number) =>
    `A imagem ${index} nao tem um formato valido`,
  unavailableImage: (index: number) =>
    `A imagem ${index} nao existe ou ja nao esta disponivel`,
  imageNotOwned: (index: number) =>
    `A imagem ${index} nao pertence ao utilizador autenticado`,
  imageAlreadyAssigned: (index: number) =>
    `A imagem ${index} ja esta associada a uma ocorrencia`,
  maxImages: (maxFiles: number) =>
    `Pode enviar no maximo ${maxFiles} fotografias`,
  imageRequired: 'A fotografia da ocorrencia e obrigatoria',
  locationRequired: 'A localizacao da ocorrencia e obrigatoria',
  otherCategoryRequired:
    'O detalhe da categoria e obrigatorio quando a categoria e OUTROS',
  noUploadFiles: 'Envie pelo menos uma fotografia',
  internalCommentFailed: 'Nao foi possivel criar o comentario interno',
} as const;

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
  [OccurrenceStatus.SUBMETIDA]: [OccurrenceStatus.EM_TRATAMENTO],
  [OccurrenceStatus.EM_TRATAMENTO]: [OccurrenceStatus.CONCLUIDA],
  [OccurrenceStatus.CONCLUIDA]: [],
};
