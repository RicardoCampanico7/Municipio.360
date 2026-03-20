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
   * Garante que labels humanas continuam compativeis com o enum persistido.
   * @return void
   */
  it('should normalize human-friendly category labels', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: 'Iluminacao publica',
      location: 'Rua A',
      imageUrls: [SMALL_IMAGE_DATA_URL],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.category).toBe(OccurrenceCategory.ILUMINACAO_PUBLICA);
  });

  /**
   * Garante que fotografias podem ser omitidas em pedidos multipart ou JSON sem imagens.
   * @return void
   */
  it('should allow requests without imageUrls in the body', async () => {
    const dto = plainToInstance(CreateOccurrenceDto, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
