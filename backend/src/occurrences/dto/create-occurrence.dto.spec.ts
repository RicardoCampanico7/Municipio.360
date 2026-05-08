import { OccurrenceCategory } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOccurrenceDto } from './create-occurrence.dto';

const SMALL_IMAGE_DATA_URL =
  'data:image/png;base64,' + Buffer.from('small-image').toString('base64');

/**
 * Valida os campos obrigatorios do DTO de criacao de ocorrencias.
 */
describe('CreateOccurrenceDto', () => {
  /**
   * Garante que o DTO aceita categorias canonicas do enum esperado pelo backend.
   * @return void
   */
  it('should accept canonical occurrence category enum values', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: OccurrenceCategory.BURACOS_PAVIMENTO,
      location: 'Rua A',
      imageUrls: [SMALL_IMAGE_DATA_URL],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.category).toBe(OccurrenceCategory.BURACOS_PAVIMENTO);
  });

  /**
   * Garante que apenas valores canonicos do enum sao aceites.
   * @return void
   */
  it('should reject human-friendly category labels', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: 'Iluminacao publica',
      location: 'Rua A',
      imageUrls: [SMALL_IMAGE_DATA_URL],
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  /**
   * Garante que o DTO permite pedidos multipart em que os ficheiros chegam fora do body.
   * @return void
   */
  it('should allow multipart bodies without image URL fields', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  /**
   * Garante que uma unica URL publica enviada no campo canonico e normalizada para array.
   * @return void
   */
  it('should normalize a single uploadedImageUrls string into an array', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
      uploadedImageUrls: '/uploads/occurrences/existing.png',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.uploadedImageUrls).toEqual([
      '/uploads/occurrences/existing.png',
    ]);
  });

  /**
   * Garante que strings com espacos sao limpas antes da validacao final.
   * @return void
   */
  it('should trim textual fields before validation', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: OccurrenceCategory.OUTROS,
      otherCategoryDetail: '  Passadeira apagada  ',
      description: '  Sinal quase ilegivel  ',
      location: '  Rua A  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.otherCategoryDetail).toBe('Passadeira apagada');
    expect(dto.description).toBe('Sinal quase ilegivel');
    expect(dto.location).toBe('Rua A');
  });
});
