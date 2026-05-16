import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class SafeUserResponseDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Maria Fernandes' })
  name: string;

  @ApiProperty({ example: '12345678 1 AB2' })
  biNumber: string;

  @ApiProperty({ example: '1000-123' })
  postalCode: string;

  @ApiProperty({ example: 'cidadao@municipio360.pt' })
  email: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    nullable: true,
    description:
      'Fotografia de perfil em data URL base64. Quando o utilizador nao tem imagem, o valor e null.',
  })
  avatarUrl: string | null;

  @ApiProperty({ enum: Role, example: Role.CIVIL })
  role: Role;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
    required: false,
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
    required: false,
  })
  updatedAt?: Date;
}

export class AuthLoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT para autenticar pedidos protegidos',
  })
  accessToken: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'Tipo do token devolvido',
  })
  tokenType: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token usado para renovar a sessao sem nova password',
  })
  refreshToken: string;

  @ApiProperty({ type: SafeUserResponseDto })
  user: SafeUserResponseDto;
}

export class AuthRefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Novo JWT para autenticar pedidos protegidos',
  })
  accessToken: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'Tipo do token devolvido',
  })
  tokenType: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Novo refresh token rotacionado',
  })
  refreshToken: string;
}

export class AuthRegisterResponseDto {
  @ApiProperty({
    example: 'Utilizador registado com sucesso',
  })
  message: string;

  @ApiProperty({ type: SafeUserResponseDto })
  user: SafeUserResponseDto;
}

export class AuthMeResponseDto {
  @ApiProperty({ type: SafeUserResponseDto })
  user: SafeUserResponseDto;
}

export class AuthLogoutResponseDto {
  @ApiProperty({
    example: 'Sessao terminada com sucesso',
  })
  message: string;
}

export class AuthDeleteAccountResponseDto {
  @ApiProperty({
    example: 'Conta apagada com sucesso',
  })
  message: string;

  @ApiProperty({
    example: true,
    description:
      'Indica ao frontend que a conta foi desativada e a sessao local deve ser limpa.',
  })
  accountDeleted: boolean;
}
