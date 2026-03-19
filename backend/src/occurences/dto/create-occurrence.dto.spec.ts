import { plainToInstance } from 'class-transformer';
import { OccurrenceCategory } from '@prisma/client';
import { validate } from 'class-validator';
import { CreateOccurrenceDto } from './create-occurrence.dto';

const SMALL_IMAGE_DATA_URL =
  'data:image/png;base64,' + Buffer.from('small-image').toString('base64');

/**
 * Valida os campos obrigatorios do DTO de criacao de ocorrencias.
 */
describe('CreateOccurrenceDto', () => {
  /**
   * Garante que o DTO aceita categorias canónicas do enum esperado pelo backend.
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
   * Garante que fotografias passam a ser obrigatorias no pedido.
   * @return void
   */
  it('should require at least one image', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
      imageUrls: [],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'imageUrls')).toBe(true);
  });
});
