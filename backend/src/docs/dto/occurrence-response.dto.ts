import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificationStatus, OccurrenceCategory, OccurrenceStatus, Role } from '@prisma/client';

export class OccurrenceOwnerSummaryResponseDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Maria Fernandes' })
  name: string;

  @ApiProperty({ example: 'cidadao@municipio360.pt' })
  email: string;

  @ApiProperty({ example: '1000-123' })
  postalCode: string;

  @ApiProperty({ enum: Role, example: Role.CIVIL })
  role: Role;

  @ApiProperty({
    enum: CertificationStatus,
    example: CertificationStatus.CERTIFIED,
  })
  certStatus: CertificationStatus;
}

export class OccurrenceInternalCommentAuthorResponseDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Operador Municipal' })
  name: string;

  @ApiProperty({ example: 'operador@municipio360.pt' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.OPERADOR })
  role: Role;
}

export class OccurrenceInternalCommentResponseDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({
    example: 'Equipa de manutencao notificada para verificacao no local.',
  })
  content: string;

  @ApiProperty({ example: 21 })
  occurrenceId: number;

  @ApiProperty({ example: 3 })
  userId: number;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
  })
  updatedAt: Date;

  @ApiProperty({ type: OccurrenceInternalCommentAuthorResponseDto })
  user: OccurrenceInternalCommentAuthorResponseDto;
}

export class PublicOccurrenceResponseDto {
  @ApiProperty({ example: 21 })
  id: number;

  @ApiProperty({
    example: 'Iluminacao publica',
    description: 'Categoria apresentada ao cliente',
  })
  category: string;

  @ApiProperty({
    enum: OccurrenceCategory,
    example: OccurrenceCategory.ILUMINACAO_PUBLICA,
    description: 'Categoria persistida em base de dados',
  })
  categoryKey: OccurrenceCategory;

  @ApiProperty({
    example: 'Iluminacao publica',
    description: 'Titulo legivel montado a partir da categoria',
  })
  title: string;

  @ApiPropertyOptional({
    example: 'Poste partido junto ao jardim',
    nullable: true,
  })
  otherCategoryDetail?: string | null;

  @ApiProperty({
    example: 'O candeeiro esta apagado ha 3 dias.',
  })
  description: string;

  @ApiProperty({
    example: 'Rua da Escola, junto ao numero 12',
  })
  location: string;

  @ApiProperty({
    type: [String],
    example: ['http://localhost:3000/uploads/occurrences/exemplo.jpg'],
  })
  imageUrls: string[];

  @ApiProperty({
    example: 'open',
    description: 'Estado apresentado ao frontend',
  })
  status: string;

  @ApiProperty({
    enum: OccurrenceStatus,
    example: OccurrenceStatus.SUBMETIDA,
    description: 'Estado persistido em base de dados',
  })
  statusKey: OccurrenceStatus;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
  })
  updatedAt: Date;
}

export class OwnerOccurrenceResponseDto extends PublicOccurrenceResponseDto {
  @ApiProperty({ example: 7 })
  userId: number;
}

export class OperatorOccurrenceResponseDto {
  @ApiProperty({ example: 21 })
  id: number;

  @ApiProperty({
    enum: OccurrenceCategory,
    example: OccurrenceCategory.ILUMINACAO_PUBLICA,
  })
  category: OccurrenceCategory;

  @ApiPropertyOptional({
    example: 'Poste partido junto ao jardim',
    nullable: true,
  })
  otherCategoryDetail?: string | null;

  @ApiProperty({
    example: 'O candeeiro esta apagado ha 3 dias.',
  })
  description: string;

  @ApiProperty({
    example: 'Rua da Escola, junto ao numero 12',
  })
  location: string;

  @ApiProperty({
    type: [String],
    example: ['http://localhost:3000/uploads/occurrences/exemplo.jpg'],
  })
  imageUrls: string[];

  @ApiProperty({
    enum: OccurrenceStatus,
    example: OccurrenceStatus.SUBMETIDA,
  })
  status: OccurrenceStatus;

  @ApiProperty({ example: 7 })
  userId: number;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-04-05T10:15:30.000Z',
  })
  updatedAt: Date;

  @ApiProperty({ type: OccurrenceOwnerSummaryResponseDto })
  user: OccurrenceOwnerSummaryResponseDto;

  @ApiProperty({ type: [OccurrenceInternalCommentResponseDto] })
  internalComments: OccurrenceInternalCommentResponseDto[];
}

export class OccurrenceImageUploadResponseDto {
  @ApiProperty({
    type: [String],
    example: [
      'http://localhost:3000/uploads/occurrences/7/1712310000000-foto-1.jpg',
    ],
  })
  imageUrls: string[];
}
