import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  occurrenceUploadConfig,
  type OccurrenceImageMetadata,
} from '../../../src/occurrences/upload/occurrence-upload';
import {
  FIXED_OCCURRENCE_IMAGE_BUFFER,
  FIXED_OCCURRENCE_IMAGE_METADATA,
  FIXED_OCCURRENCE_IMAGE_URLS,
} from './upload-fixtures';

export type OccurrenceUploadFixtureKey =
  keyof typeof FIXED_OCCURRENCE_IMAGE_URLS;

export type SeedOccurrenceUploadFixtureEntry = {
  imageUrl: string;
  metadata: OccurrenceImageMetadata;
  fileBuffer?: Buffer;
};

export type SeededOccurrenceUploadFixtureEntry =
  SeedOccurrenceUploadFixtureEntry & {
    absolutePath: string;
    metadataPath: string;
  };

export type OccurrenceUploadFixtureSandbox = {
  uploadsRoot: string;
  uploadsMetadataRoot: string;
  cleanup: () => Promise<void>;
};

/**
 * Resolve o nome do ficheiro a partir da URL publica da fixture.
 * @param imageUrl URL publica canonica da imagem.
 * @return string Nome do ficheiro correspondente.
 */
function getFixtureFilenameFromPublicUrl(imageUrl: string) {
  const filename = imageUrl.split('/').pop();

  if (!filename || filename.includes('\\')) {
    throw new Error(`Occurrence fixture image URL is invalid: ${imageUrl}`);
  }

  return filename;
}

/**
 * Cria diretórios temporários isolados para imagens e metadata de uploads.
 * @return Promise<OccurrenceUploadFixtureSandbox> Sandbox temporário com cleanup.
 */
export async function createOccurrenceUploadFixtureSandbox(): Promise<OccurrenceUploadFixtureSandbox> {
  const uploadsRoot = await mkdtemp(join(tmpdir(), 'municipio360-occ-'));
  const uploadsMetadataRoot = await mkdtemp(
    join(tmpdir(), 'municipio360-occ-meta-'),
  );

  return {
    uploadsRoot,
    uploadsMetadataRoot,
    cleanup: async () => {
      await rm(uploadsRoot, { recursive: true, force: true });
      await rm(uploadsMetadataRoot, { recursive: true, force: true });
    },
  };
}

/**
 * Aplica uma sandbox temporária à configuracao runtime de uploads.
 * @param sandbox Diretórios temporários a usar pelo modulo de uploads.
 */
export function applyOccurrenceUploadFixtureSandboxToRuntimeConfig(
  sandbox: Pick<
    OccurrenceUploadFixtureSandbox,
    'uploadsRoot' | 'uploadsMetadataRoot'
  >,
) {
  const mutableConfig = occurrenceUploadConfig as {
    uploadsRoot: string;
    uploadsMetadataRoot: string;
  };

  mutableConfig.uploadsRoot = sandbox.uploadsRoot;
  mutableConfig.uploadsMetadataRoot = sandbox.uploadsMetadataRoot;
}

/**
 * Constrói entradas fixas a partir das fixtures versionadas.
 * @param keys Nomes lógicos das fixtures pretendidas.
 * @return SeedOccurrenceUploadFixtureEntry[] Entradas prontas a semear no disco.
 */
export function getFixedOccurrenceUploadFixtureEntries(
  keys: OccurrenceUploadFixtureKey[],
): SeedOccurrenceUploadFixtureEntry[] {
  return keys.map((key) => ({
    imageUrl: FIXED_OCCURRENCE_IMAGE_URLS[key],
    metadata: FIXED_OCCURRENCE_IMAGE_METADATA[key],
    fileBuffer: FIXED_OCCURRENCE_IMAGE_BUFFER,
  }));
}

/**
 * Persiste um conjunto de imagens e metadata fixa num sandbox de teste.
 * @param param0 Diretórios alvo e entradas a semear.
 * @return Promise<SeededOccurrenceUploadFixtureEntry[]> Entradas com caminhos absolutos gerados.
 */
export async function seedOccurrenceUploadFixtures({
  uploadsRoot,
  uploadsMetadataRoot,
  entries,
}: {
  uploadsRoot: string;
  uploadsMetadataRoot: string;
  entries: SeedOccurrenceUploadFixtureEntry[];
}): Promise<SeededOccurrenceUploadFixtureEntry[]> {
  await mkdir(uploadsRoot, { recursive: true });
  await mkdir(uploadsMetadataRoot, { recursive: true });

  return Promise.all(
    entries.map(async (entry) => {
      const filename = getFixtureFilenameFromPublicUrl(entry.imageUrl);
      const absolutePath = join(uploadsRoot, filename);
      const metadataPath = join(uploadsMetadataRoot, `${filename}.json`);

      await writeFile(
        absolutePath,
        entry.fileBuffer ?? FIXED_OCCURRENCE_IMAGE_BUFFER,
      );
      await writeFile(metadataPath, JSON.stringify(entry.metadata), 'utf8');

      return {
        ...entry,
        absolutePath,
        metadataPath,
      };
    }),
  );
}

/**
 * Cria uma sandbox temporária e semeia automaticamente fixtures fixas.
 * @param param0 Configuracao opcional das fixtures e aplicacao no runtime.
 * @return Promise com sandbox e entradas já preparadas para o teste.
 */
export async function createSeededOccurrenceUploadFixtureSandbox({
  keys = Object.keys(
    FIXED_OCCURRENCE_IMAGE_URLS,
  ) as OccurrenceUploadFixtureKey[],
  applyToRuntimeConfig = false,
}: {
  keys?: OccurrenceUploadFixtureKey[];
  applyToRuntimeConfig?: boolean;
} = {}) {
  const sandbox = await createOccurrenceUploadFixtureSandbox();

  if (applyToRuntimeConfig) {
    applyOccurrenceUploadFixtureSandboxToRuntimeConfig(sandbox);
  }

  const seededEntries = await seedOccurrenceUploadFixtures({
    uploadsRoot: sandbox.uploadsRoot,
    uploadsMetadataRoot: sandbox.uploadsMetadataRoot,
    entries: getFixedOccurrenceUploadFixtureEntries(keys),
  });

  return {
    ...sandbox,
    seededEntries,
  };
}
