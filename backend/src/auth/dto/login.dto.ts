import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Representa os dados minimos necessarios para autenticar um utilizador.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O DTO deve transportar sempre um email valido e uma password com tamanho minimo.
 */
export class LoginDto {
  @ApiProperty({
    example: 'cidadao@municipio360.pt',
    description: 'Email do utilizador registado',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SenhaSegura123',
    description: 'Password do utilizador',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}
