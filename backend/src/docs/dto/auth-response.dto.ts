import { ApiProperty } from '@nestjs/swagger';
import { CertificationStatus, Role } from '@prisma/client';

export class SafeUserResponseDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Maria Fernandes' })
  name: string;

  @ApiProperty({ example: '12345678' })
  biNumber: string;

  @ApiProperty({ example: '1000-123' })
  postalCode: string;

  @ApiProperty({ example: 'cidadao@municipio360.pt' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.CIVIL })
  role: Role;

  @ApiProperty({
    enum: CertificationStatus,
    example: CertificationStatus.CERTIFIED,
  })
  certStatus: CertificationStatus;

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

  @ApiProperty({ type: SafeUserResponseDto })
  user: SafeUserResponseDto;
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
