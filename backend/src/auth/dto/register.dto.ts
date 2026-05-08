import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * Representa os dados necessarios para registar um utilizador civil.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 23/03/2026
 * @inv O DTO deve conter dados minimamente validos para criacao do utilizador.
 */
export class RegisterDto {
  @ApiProperty({
    example: 'Maria Fernandes',
    description: 'Nome completo do utilizador',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: '12345678',
    description: 'Numero de BI/CC em formato alfanumerico',
  })
  @IsString()
  @Matches(/^[0-9A-Z\s]{8,14}$/)
  biNumber: string;

  @ApiProperty({
    example: '1000-123',
    description: 'Codigo postal do utilizador',
  })
  @IsString()
  @Matches(/^\d{4}-\d{3}$/)
  postalCode: string;

  @ApiProperty({
    example: 'cidadao@municipio360.pt',
    description: 'Email unico do utilizador',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description:
      'Fotografia de perfil opcional em formato data URL (PNG, JPEG, WEBP ou GIF)',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i)
  avatarUrl?: string;

  @ApiProperty({
    example: 'SenhaSegura123',
    description: 'Password com pelo menos 8 caracteres',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.CIVIL,
    description:
      'Role opcional; por omissao o registo deve criar um utilizador CIVIL',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
