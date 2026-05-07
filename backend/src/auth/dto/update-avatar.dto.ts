import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, ValidateIf } from 'class-validator';

/**
 * Representa a fotografia de perfil enviada para atualizar o utilizador autenticado.
 */
export class UpdateAvatarDto {
  @ApiPropertyOptional({
    example:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    nullable: true,
    description:
      'Nova fotografia de perfil em data URL, ou null para remover a fotografia atual.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i)
  avatarUrl?: string | null;
}
