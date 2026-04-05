import { ApiProperty } from '@nestjs/swagger';

export class PublicMenuItemResponseDto {
  @ApiProperty({ example: 'home' })
  key: string;

  @ApiProperty({ example: '/' })
  path: string;

  @ApiProperty({ example: 'home' })
  icon: string;

  @ApiProperty({ example: true })
  public: boolean;

  @ApiProperty({ example: false })
  requiresAuth: boolean;

  @ApiProperty({ example: 'Inicio' })
  label: string;
}

export class MenuLanguageResponseDto {
  @ApiProperty({ example: 'pt' })
  code: string;

  @ApiProperty({ example: 'Portugues' })
  label: string;
}

export class PublicMenuResponseDto {
  @ApiProperty({ example: 'Municipio 360' })
  appName: string;

  @ApiProperty({ example: 'pt' })
  locale: string;

  @ApiProperty({ type: [PublicMenuItemResponseDto] })
  items: PublicMenuItemResponseDto[];

  @ApiProperty({ type: [MenuLanguageResponseDto] })
  languages: MenuLanguageResponseDto[];
}
