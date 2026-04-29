import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { dirname, join } from 'path';
import { access, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const DEFAULT_UPLOADS_ROOT = join(process.cwd(), 'uploads', 'occurrences');
const DEFAULT_PUBLIC_BASE_PATH = '/uploads/occurrences';
export const OCCURRENCE_IMAGE_UPLOAD_FIELD_NAME = 'imageUrls';
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const PUBLIC_IMAGE_FILENAME_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|gif)$/i;

/**
 * Centraliza a validacao, persistencia e metadata privada das imagens de ocorrencias.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 23/03/2026
 * @inv Cada URL publica valida deve mapear para um ficheiro local e, quando existir, para metadata consistente.
 */
export interface UploadedOccurrenceImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface OccurrenceImageMetadata {
  ownerUserId: number;
  createdAt: string;
  occurrenceId: number | null;
}

const configuredUploadsRoot =
  process.env.OCCURRENCES_UPLOAD_DIR ?? DEFAULT_UPLOADS_ROOT;
const configuredUploadsMetadataRoot =
  process.env.OCCURRENCES_UPLOAD_METADATA_DIR ??
  join(dirname(configuredUploadsRoot), '.occurrences-meta');

export const occurrenceUploadConfig = {
  maxFiles: Number(process.env.OCCURRENCES_MAX_IMAGES ?? DEFAULT_MAX_FILES),
  maxFileSizeBytes: Number(
    process.env.OCCURRENCES_MAX_IMAGE_SIZE_BYTES ?? DEFAULT_MAX_FILE_SIZE_BYTES,
  ),
  uploadsRoot: configuredUploadsRoot,
  uploadsMetadataRoot: configuredUploadsMetadataRoot,
  publicBasePath:
    process.env.OCCURRENCES_UPLOAD_PUBLIC_PATH ?? DEFAULT_PUBLIC_BASE_PATH,
} as const;

const OCCURRENCE_PUBLIC_URL_PREFIX = `${occurrenceUploadConfig.publicBasePath}/`;

/**
 * Resolve a extensao final usada no ficheiro persistido com base no mimetype/origem.
 * @param mimetype Tipo MIME validado pelo multer.
 * @param originalname Nome original recebido no upload.
 * @return string Extensao adequada para guardar o ficheiro.
 */
function getFileExtension(mimetype: string, originalname: string) {
  switch (mimetype) {
    case 'image/jpeg':
      return originalname.toLowerCase().endsWith('.jpeg') ? '.jpeg' : '.jpg';
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

/**
 * Confirma que o conteudo recebido parece corresponder ao formato declarado.
 * @param file Ficheiro recebido em memoria pelo multer.
 * @return boolean Verdadeiro quando os bytes iniciais batem com o tipo esperado.
 */
function isAllowedImageBuffer(file: UploadedOccurrenceImage) {
  const buffer = file.buffer;

  switch (file.mimetype) {
    case 'image/jpeg':
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    case 'image/gif':
      return (
        buffer.length >= 6 &&
        (buffer.toString('ascii', 0, 6) === 'GIF87a' ||
          buffer.toString('ascii', 0, 6) === 'GIF89a')
      );
    default:
      return false;
  }
}

/**
 * Devolve a configuracao do multer para uploads de fotografias de ocorrencias.
 * @return Opcaoes de armazenamento em memoria, limites e filtro de ficheiros.
 */
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

/**
 * Valida se uma URL corresponde ao formato publico canonico das imagens de ocorrencias.
 * @param imageUrl URL publica recebida do cliente.
 * @return boolean Verdadeiro quando a URL e segura e aponta para um unico ficheiro.
 */
export function isOccurrenceUploadPublicUrl(imageUrl: string) {
  if (!imageUrl.startsWith(OCCURRENCE_PUBLIC_URL_PREFIX)) {
    return false;
  }

  const filename = imageUrl.slice(OCCURRENCE_PUBLIC_URL_PREFIX.length);

  return PUBLIC_IMAGE_FILENAME_PATTERN.test(filename);
}

/**
 * Extrai o nome do ficheiro a partir de uma URL publica valida.
 * @param imageUrl URL publica da imagem.
 * @return string | null Nome do ficheiro ou null quando a URL nao e valida.
 */
function getOccurrenceUploadFilename(imageUrl: string) {
  if (!isOccurrenceUploadPublicUrl(imageUrl)) {
    return null;
  }

  return imageUrl.slice(OCCURRENCE_PUBLIC_URL_PREFIX.length);
}

/**
 * Resolve o caminho absoluto do ficheiro de imagem a partir da URL publica.
 * @param imageUrl URL publica da imagem.
 * @return string | null Caminho absoluto do ficheiro ou null quando a URL nao e valida.
 */
function getOccurrenceUploadAbsolutePath(imageUrl: string) {
  const filename = getOccurrenceUploadFilename(imageUrl);

  if (!filename) {
    return null;
  }

  return join(occurrenceUploadConfig.uploadsRoot, filename);
}

/**
 * Resolve o caminho absoluto do ficheiro de metadata privada da imagem.
 * @param imageUrl URL publica da imagem.
 * @return string | null Caminho absoluto da metadata ou null quando a URL nao e valida.
 */
function getOccurrenceUploadMetadataPath(imageUrl: string) {
  const filename = getOccurrenceUploadFilename(imageUrl);

  if (!filename) {
    return null;
  }

  return join(occurrenceUploadConfig.uploadsMetadataRoot, `${filename}.json`);
}

/**
 * Persiste metadata privada de ownership/associacao para uma imagem ja guardada.
 * @param imageUrl URL publica da imagem.
 * @param metadata Metadata a persistir.
 * @return Promise<void> Promessa resolvida quando a metadata fica atualizada.
 */
async function writeOccurrenceImageMetadata(
  imageUrl: string,
  metadata: OccurrenceImageMetadata,
) {
  const metadataPath = getOccurrenceUploadMetadataPath(imageUrl);

  if (!metadataPath) {
    throw new Error('Occurrence image metadata path is invalid');
  }

  await writeFile(metadataPath, JSON.stringify(metadata), 'utf8');
}

/**
 * Verifica se um objeto lido do disco respeita a estrutura esperada da metadata.
 * @param metadata Valor desserializado do ficheiro JSON.
 * @return boolean Verdadeiro quando a metadata tem o formato esperado.
 */
function isOccurrenceImageMetadata(
  metadata: unknown,
): metadata is OccurrenceImageMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  const candidate = metadata as Partial<OccurrenceImageMetadata>;

  return (
    typeof candidate.ownerUserId === 'number' &&
    typeof candidate.createdAt === 'string' &&
    (typeof candidate.occurrenceId === 'number' ||
      candidate.occurrenceId === null)
  );
}

/**
 * Verifica se a imagem correspondente a uma URL publica ainda existe em disco.
 * @param imageUrl URL publica da imagem.
 * @return Promise<boolean> Verdadeiro quando o ficheiro esta disponivel.
 */
export async function occurrenceImageExistsByUrl(imageUrl: string) {
  const absolutePath = getOccurrenceUploadAbsolutePath(imageUrl);

  if (!absolutePath) {
    return false;
  }

  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Le a metadata privada de uma imagem a partir da respetiva URL publica.
 * @param imageUrl URL publica da imagem.
 * @return Promise<OccurrenceImageMetadata | null> Metadata valida ou null quando nao existe/esta invalida.
 */
export async function getOccurrenceImageMetadataByUrl(imageUrl: string) {
  const metadataPath = getOccurrenceUploadMetadataPath(imageUrl);

  if (!metadataPath) {
    return null;
  }

  try {
    const serializedMetadata = await readFile(metadataPath, 'utf8');
    const parsedMetadata: unknown = JSON.parse(serializedMetadata);

    return isOccurrenceImageMetadata(parsedMetadata) ? parsedMetadata : null;
  } catch {
    return null;
  }
}

/**
 * Garante que a diretoria publica das imagens de ocorrencias existe.
 * @return Promise<void> Promessa resolvida quando a diretoria esta pronta.
 */
export async function ensureOccurrenceUploadsDirectory() {
  await mkdir(occurrenceUploadConfig.uploadsRoot, { recursive: true });
}

/**
 * Garante que a diretoria privada das metadata de uploads existe.
 * @return Promise<void> Promessa resolvida quando a diretoria esta pronta.
 */
async function ensureOccurrenceUploadsMetadataDirectory() {
  await mkdir(occurrenceUploadConfig.uploadsMetadataRoot, { recursive: true });
}

/**
 * Guarda novas imagens no disco e cria metadata privada com o respetivo owner.
 * @param files Ficheiros validados recebidos no pedido.
 * @param ownerUserId Identificador do utilizador dono do upload.
 * @return Promise<string[]> Lista das URLs publicas criadas para as imagens guardadas.
 */
export async function saveOccurrenceImages(
  files: UploadedOccurrenceImage[],
  ownerUserId: number,
) {
  if (!files.length) {
    return [];
  }

  await ensureOccurrenceUploadsDirectory();
  await ensureOccurrenceUploadsMetadataDirectory();

  const savedPaths: string[] = [];
  const savedMetadataPaths: string[] = [];
  const savedUrls: string[] = [];

  try {
    for (const file of files) {
      if (!isAllowedImageBuffer(file)) {
        throw new BadRequestException(
          'O ficheiro enviado nao e uma imagem valida',
        );
      }

      const filename = `${randomUUID()}${getFileExtension(
        file.mimetype,
        file.originalname,
      )}`;
      const absolutePath = join(occurrenceUploadConfig.uploadsRoot, filename);
      const publicUrl = `${occurrenceUploadConfig.publicBasePath}/${filename}`;
      const metadataPath = join(
        occurrenceUploadConfig.uploadsMetadataRoot,
        `${filename}.json`,
      );

      await writeFile(absolutePath, file.buffer);
      await writeFile(
        metadataPath,
        JSON.stringify({
          ownerUserId,
          createdAt: new Date().toISOString(),
          occurrenceId: null,
        } satisfies OccurrenceImageMetadata),
        'utf8',
      );
      savedPaths.push(absolutePath);
      savedMetadataPaths.push(metadataPath);
      savedUrls.push(publicUrl);
    }

    return savedUrls;
  } catch (error) {
    await removeOccurrenceImagesByPaths(savedPaths);
    await removeOccurrenceImageMetadataByPaths(savedMetadataPaths);
    throw error;
  }
}

/**
 * Remove imagens e metadata privada a partir de URLs publicas previamente emitidas.
 * @param imageUrls URLs publicas das imagens a remover.
 * @return Promise<void> Promessa resolvida quando os ficheiros sao removidos.
 */
export async function removeOccurrenceImagesByUrls(imageUrls: string[]) {
  const paths = imageUrls
    .map((imageUrl) => getOccurrenceUploadAbsolutePath(imageUrl))
    .filter((path): path is string => Boolean(path));
  const metadataPaths = imageUrls
    .map((imageUrl) => getOccurrenceUploadMetadataPath(imageUrl))
    .filter((path): path is string => Boolean(path));

  await removeOccurrenceImagesByPaths(paths);
  await removeOccurrenceImageMetadataByPaths(metadataPaths);
}

/**
 * Marca um conjunto de imagens como definitivamente associado a uma ocorrencia criada.
 * @param imageUrls URLs publicas das imagens associadas.
 * @param occurrenceId Identificador da ocorrencia final.
 * @return Promise<void> Promessa resolvida quando a metadata fica atualizada.
 */
export async function assignOccurrenceImagesToOccurrence(
  imageUrls: string[],
  occurrenceId: number,
) {
  const previousMetadataEntries: Array<{
    imageUrl: string;
    metadata: OccurrenceImageMetadata;
  }> = [];

  try {
    for (const imageUrl of imageUrls) {
      const metadata = await getOccurrenceImageMetadataByUrl(imageUrl);

      if (!metadata) {
        throw new Error('Occurrence image metadata is missing');
      }

      previousMetadataEntries.push({ imageUrl, metadata });
      await writeOccurrenceImageMetadata(imageUrl, {
        ...metadata,
        occurrenceId,
      });
    }
  } catch (error) {
    await Promise.all(
      previousMetadataEntries.map(({ imageUrl, metadata }) =>
        writeOccurrenceImageMetadata(imageUrl, metadata).catch(() => undefined),
      ),
    );
    throw error;
  }
}

/**
 * Remove a associacao logica entre imagens e ocorrencia, preservando ownership.
 * @param imageUrls URLs publicas das imagens.
 * @param occurrenceId Identificador da ocorrencia a desassociar.
 * @return Promise<void> Promessa resolvida quando a metadata volta ao estado livre.
 */
export async function unassignOccurrenceImagesFromOccurrence(
  imageUrls: string[],
  occurrenceId: number,
) {
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const metadata = await getOccurrenceImageMetadataByUrl(imageUrl);

      if (!metadata || metadata.occurrenceId !== occurrenceId) {
        return;
      }

      await writeOccurrenceImageMetadata(imageUrl, {
        ...metadata,
        occurrenceId: null,
      });
    }),
  );
}

/**
 * Remove ficheiros de imagem do disco ignorando ausencias.
 * @param paths Caminhos absolutos dos ficheiros de imagem.
 * @return Promise<void> Promessa resolvida quando a remocao termina.
 */
async function removeOccurrenceImagesByPaths(paths: string[]) {
  await Promise.all(
    paths.map((path) =>
      rm(path, {
        force: true,
      }),
    ),
  );
}

/**
 * Remove ficheiros de metadata privada do disco ignorando ausencias.
 * @param paths Caminhos absolutos dos ficheiros de metadata.
 * @return Promise<void> Promessa resolvida quando a remocao termina.
 */
async function removeOccurrenceImageMetadataByPaths(paths: string[]) {
  await Promise.all(
    paths.map((path) =>
      rm(path, {
        force: true,
      }),
    ),
  );
}
