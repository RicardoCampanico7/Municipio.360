import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Representa os dados minimos necessarios para autenticar um utilizador.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O DTO deve transportar sempre um email valido e uma password com tamanho minimo.
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
