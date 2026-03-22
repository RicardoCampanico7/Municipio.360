import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Representa os dados necessarios para registar um utilizador.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O DTO deve conter dados minimamente validos para criacao do utilizador.
 */
export class RegisterDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @Matches(/^[0-9A-Z\s]{8,14}$/)
  biNumber: string;

  @IsString()
  @Matches(/^\d{4}-\d{3}$/)
  postalCode: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
