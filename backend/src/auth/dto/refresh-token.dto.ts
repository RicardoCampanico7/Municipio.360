import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Representa o refresh token usado para renovar a sessao.
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token recebido em /auth/login ou /auth/refresh',
  })
  @IsString()
  @MinLength(20)
  refreshToken: string;
}
