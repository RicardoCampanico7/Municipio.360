import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

/**
 * Valida o DTO de registo de utilizadores.
 */
describe('RegisterDto', () => {
  /**
   * Garante que o cliente pode omitir a fotografia de perfil.
   * @return void
   */
  it('should allow register requests without avatarUrl', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Maria Fernandes',
      biNumber: '12345678',
      postalCode: '1000-123',
      email: 'cidadao@municipio360.pt',
      password: 'SenhaSegura123',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  /**
   * Garante que avatarUrl vazio e tratado como fotografia omitida.
   * @return void
   */
  it('should normalize a blank avatarUrl to an omitted value', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Maria Fernandes',
      biNumber: '12345678',
      postalCode: '1000-123',
      email: 'cidadao@municipio360.pt',
      avatarUrl: '   ',
      password: 'SenhaSegura123',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.avatarUrl).toBeUndefined();
  });
});
