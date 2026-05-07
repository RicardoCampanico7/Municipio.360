import { readFile } from 'fs/promises';
import {
  applyOccurrenceUploadFixtureSandboxToRuntimeConfig,
  createOccurrenceUploadFixtureSandbox,
  createSeededOccurrenceUploadFixtureSandbox,
  type OccurrenceUploadFixtureSandbox,
} from '../../../test/fixtures/occurrences/upload-fixture-helpers';
import {
  FIXED_OCCURRENCE_IMAGE_BUFFER,
  FIXED_OCCURRENCE_IMAGE_FILE,
  FIXED_OCCURRENCE_IMAGE_METADATA,
  FIXED_OCCURRENCE_IMAGE_URLS,
} from '../../../test/fixtures/occurrences/upload-fixtures';
import {
  assignOccurrenceImagesToOccurrence,
  getOccurrenceImageMetadataByUrl,
  occurrenceImageExistsByUrl,
  occurrenceUploadConfig,
  removeOccurrenceImagesByUrls,
  saveOccurrenceImages,
  unassignOccurrenceImagesFromOccurrence,
} from './occurrence-upload';

/**
 * Valida a persistencia real de uploads de ocorrencias sem tocar em backend/uploads.
 */
describe('occurrence-upload helpers', () => {
  const originalUploadsRoot = occurrenceUploadConfig.uploadsRoot;
  const originalUploadsMetadataRoot = occurrenceUploadConfig.uploadsMetadataRoot;
  let sandbox: OccurrenceUploadFixtureSandbox | null = null;

  afterEach(async () => {
    if (sandbox) {
      await sandbox.cleanup();
      sandbox = null;
    }

    applyOccurrenceUploadFixtureSandboxToRuntimeConfig({
      uploadsRoot: originalUploadsRoot,
      uploadsMetadataRoot: originalUploadsMetadataRoot,
    });
  });

  /**
   * Garante que uma imagem valida e gravada com metadata privada do owner.
   * @return Promise<void>
   */
  it('should save valid occurrence images with owner metadata in a temporary sandbox', async () => {
    sandbox = await createOccurrenceUploadFixtureSandbox();
    applyOccurrenceUploadFixtureSandboxToRuntimeConfig(sandbox);

    const [imageUrl] = await saveOccurrenceImages(
      [
        {
          buffer: FIXED_OCCURRENCE_IMAGE_BUFFER,
          mimetype: FIXED_OCCURRENCE_IMAGE_FILE.mimetype,
          originalname: FIXED_OCCURRENCE_IMAGE_FILE.filename,
          size: FIXED_OCCURRENCE_IMAGE_BUFFER.length,
        },
      ],
      FIXED_OCCURRENCE_IMAGE_METADATA.ownedPending.ownerUserId,
    );

    expect(imageUrl).toMatch(/^\/uploads\/occurrences\/.+\.png$/);
    await expect(occurrenceImageExistsByUrl(imageUrl)).resolves.toBe(true);
    await expect(getOccurrenceImageMetadataByUrl(imageUrl)).resolves.toEqual(
      expect.objectContaining({
        ownerUserId: FIXED_OCCURRENCE_IMAGE_METADATA.ownedPending.ownerUserId,
        occurrenceId: null,
        createdAt: expect.any(String),
      }),
    );
  });

  /**
   * Garante que fixtures versionadas podem ser associadas e desassociadas por metadata.
   * @return Promise<void>
   */
  it('should assign and unassign seeded fixed occurrence image metadata', async () => {
    sandbox = await createSeededOccurrenceUploadFixtureSandbox({
      keys: ['ownedPending'],
      applyToRuntimeConfig: true,
    });

    await expect(
      occurrenceImageExistsByUrl(FIXED_OCCURRENCE_IMAGE_URLS.ownedPending),
    ).resolves.toBe(true);

    await assignOccurrenceImagesToOccurrence(
      [FIXED_OCCURRENCE_IMAGE_URLS.ownedPending],
      FIXED_OCCURRENCE_IMAGE_METADATA.ownedAssigned.occurrenceId!,
    );

    await expect(
      getOccurrenceImageMetadataByUrl(FIXED_OCCURRENCE_IMAGE_URLS.ownedPending),
    ).resolves.toEqual({
      ...FIXED_OCCURRENCE_IMAGE_METADATA.ownedPending,
      occurrenceId: FIXED_OCCURRENCE_IMAGE_METADATA.ownedAssigned.occurrenceId,
    });

    await unassignOccurrenceImagesFromOccurrence(
      [FIXED_OCCURRENCE_IMAGE_URLS.ownedPending],
      FIXED_OCCURRENCE_IMAGE_METADATA.ownedAssigned.occurrenceId!,
    );

    await expect(
      getOccurrenceImageMetadataByUrl(FIXED_OCCURRENCE_IMAGE_URLS.ownedPending),
    ).resolves.toEqual(FIXED_OCCURRENCE_IMAGE_METADATA.ownedPending);
  });

  /**
   * Garante que a remocao apaga imagem e metadata privada sem afetar diretorios reais.
   * @return Promise<void>
   */
  it('should remove fixed occurrence image files and private metadata by public URL', async () => {
    const seededSandbox = await createSeededOccurrenceUploadFixtureSandbox({
      keys: ['foreignPending'],
      applyToRuntimeConfig: true,
    });
    sandbox = seededSandbox;
    const [seededEntry] = seededSandbox.seededEntries;

    await expect(readFile(seededEntry.absolutePath)).resolves.toEqual(
      FIXED_OCCURRENCE_IMAGE_BUFFER,
    );
    await expect(readFile(seededEntry.metadataPath, 'utf8')).resolves.toBe(
      JSON.stringify(FIXED_OCCURRENCE_IMAGE_METADATA.foreignPending),
    );

    await removeOccurrenceImagesByUrls([
      FIXED_OCCURRENCE_IMAGE_URLS.foreignPending,
    ]);

    await expect(
      occurrenceImageExistsByUrl(FIXED_OCCURRENCE_IMAGE_URLS.foreignPending),
    ).resolves.toBe(false);
    await expect(
      getOccurrenceImageMetadataByUrl(FIXED_OCCURRENCE_IMAGE_URLS.foreignPending),
    ).resolves.toBeNull();
  });
});
