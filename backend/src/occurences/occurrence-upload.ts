import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const DEFAULT_UPLOADS_ROOT = join(process.cwd(), 'uploads', 'occurrences');
const DEFAULT_PUBLIC_BASE_PATH = '/uploads/occurrences';
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export interface UploadedOccurrenceImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export const occurrenceUploadConfig = {
  maxFiles: Number(process.env.OCCURRENCES_MAX_IMAGES ?? DEFAULT_MAX_FILES),
  maxFileSizeBytes: Number(
    process.env.OCCURRENCES_MAX_IMAGE_SIZE_BYTES ?? DEFAULT_MAX_FILE_SIZE_BYTES,
  ),
  uploadsRoot: process.env.OCCURRENCES_UPLOAD_DIR ?? DEFAULT_UPLOADS_ROOT,
  publicBasePath:
    process.env.OCCURRENCES_UPLOAD_PUBLIC_PATH ?? DEFAULT_PUBLIC_BASE_PATH,
} as const;

const OCCURRENCE_PUBLIC_URL_PREFIX = `${occurrenceUploadConfig.publicBasePath}/`;

function getFileExtension(mimetype: string, originalname: string) {
  const originalExtension = extname(originalname).toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  switch (mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}

export function getOccurrenceMulterOptions() {
  return {
    storage: memoryStorage(),
    limits: {
      files: occurrenceUploadConfig.maxFiles,
      fileSize: occurrenceUploadConfig.maxFileSizeBytes,
    },
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        callback(
          new BadRequestException(
            'Apenas ficheiros de imagem PNG, JPEG, WEBP ou GIF sao permitidos',
          ),
          false,
        );
        return;
      }

      callback(null, true);
    },
  };
}

export function isOccurrenceUploadPublicUrl(imageUrl: string) {
  if (!imageUrl.startsWith(OCCURRENCE_PUBLIC_URL_PREFIX)) {
    return false;
  }

  const filename = imageUrl.slice(OCCURRENCE_PUBLIC_URL_PREFIX.length);

  return (
    Boolean(filename) && !filename.includes('/') && !filename.includes('\\')
  );
}

export async function ensureOccurrenceUploadsDirectory() {
  await mkdir(occurrenceUploadConfig.uploadsRoot, { recursive: true });
}

export async function saveOccurrenceImages(files: UploadedOccurrenceImage[]) {
  if (!files.length) {
    return [];
  }

  await ensureOccurrenceUploadsDirectory();

  const savedPaths: string[] = [];
  const savedUrls: string[] = [];

  try {
    for (const file of files) {
      const filename = `${randomUUID()}${getFileExtension(
        file.mimetype,
        file.originalname,
      )}`;
      const absolutePath = join(occurrenceUploadConfig.uploadsRoot, filename);
      const publicUrl = `${occurrenceUploadConfig.publicBasePath}/${filename}`;

      await writeFile(absolutePath, file.buffer);
      savedPaths.push(absolutePath);
      savedUrls.push(publicUrl);
    }

    return savedUrls;
  } catch (error) {
    await removeOccurrenceImagesByPaths(savedPaths);
    throw error;
  }
}

export async function removeOccurrenceImagesByUrls(imageUrls: string[]) {
  const paths = imageUrls
    .filter((imageUrl) => isOccurrenceUploadPublicUrl(imageUrl))
    .map((imageUrl) =>
      join(
        occurrenceUploadConfig.uploadsRoot,
        imageUrl.slice(OCCURRENCE_PUBLIC_URL_PREFIX.length),
      ),
    );

  await removeOccurrenceImagesByPaths(paths);
}

async function removeOccurrenceImagesByPaths(paths: string[]) {
  await Promise.all(
    paths.map((path) =>
      rm(path, {
        force: true,
      }),
    ),
  );
}
