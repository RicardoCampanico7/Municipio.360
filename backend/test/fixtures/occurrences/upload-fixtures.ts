import type { OccurrenceImageMetadata } from '../../../src/occurrences/upload/occurrence-upload';

/**
 * Fixture PNG minima em base64 para testes que precisem de um ficheiro estavel.
 * Corresponde a uma imagem PNG valida de 1x1 pixel.
 */
export const FIXED_OCCURRENCE_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6d8AAAAASUVORK5CYII=';

/**
 * Buffer reutilizavel para uploads de imagem nos testes.
 */
export const FIXED_OCCURRENCE_IMAGE_BUFFER = Buffer.from(
  FIXED_OCCURRENCE_IMAGE_BASE64,
  'base64',
);

/**
 * Nome e tipo MIME canonicos para fixtures de upload.
 */
export const FIXED_OCCURRENCE_IMAGE_FILE = {
  filename: 'fixed-occurrence.png',
  mimetype: 'image/png',
} as const;

/**
 * URLs publicas deterministicas para cenarios comuns de ownership/associacao.
 */
export const FIXED_OCCURRENCE_IMAGE_URLS = {
  ownedPending: '/uploads/occurrences/fixed-owned-pending.png',
  ownedAssigned: '/uploads/occurrences/fixed-owned-assigned.png',
  foreignPending: '/uploads/occurrences/fixed-foreign-pending.png',
} as const;

/**
 * Metadata privada deterministica correspondente aos cenarios mais comuns.
 */
export const FIXED_OCCURRENCE_IMAGE_METADATA: Record<
  keyof typeof FIXED_OCCURRENCE_IMAGE_URLS,
  OccurrenceImageMetadata
> = {
  ownedPending: {
    ownerUserId: 101,
    createdAt: '2026-04-14T10:00:00.000Z',
    occurrenceId: null,
  },
  ownedAssigned: {
    ownerUserId: 101,
    createdAt: '2026-04-14T10:05:00.000Z',
    occurrenceId: 501,
  },
  foreignPending: {
    ownerUserId: 202,
    createdAt: '2026-04-14T10:10:00.000Z',
    occurrenceId: null,
  },
};
