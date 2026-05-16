import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const CITIZEN_CARD_NUMBER_PATTERN = /^\d{8} \d [A-Z]{2}\d$/;

/**
 * Representa os dados editaveis do perfil do utilizador autenticado.
 */
export class UpdateProfileDto {
  @ApiProperty({
    example: 'Maria Fernandes',
    description: 'Nome completo do utilizador',
    minLength: 3,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'cidadao@municipio360.pt',
    description: 'Email unico do utilizador',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '12345678 1 AB2',
    description: 'Numero de Cartao de Cidadao no formato 12345678 1 AB2',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(CITIZEN_CARD_NUMBER_PATTERN, {
    message: 'O Cartao de Cidadao deve usar o formato 12345678 1 AB2',
  })
  biNumber: string;

  @ApiProperty({
    example: '1000-123',
    description: 'Codigo postal do utilizador',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{4}-\d{3}$/)
  postalCode: string;
}
