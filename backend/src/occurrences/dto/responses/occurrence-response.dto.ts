import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CertificationStatus,
  OccurrenceCategory,
  OccurrenceStatus,
  Role,
} from '@prisma/client';

/**
 * Representa o resumo do autor devolvido nas respostas internas de ocorrencias.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve expor apenas os campos necessarios para identificar o autor em contexto interno.
 */
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

/**
 * Representa o autor reduzido de um comentario interno de ocorrencia.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve conter apenas os dados minimos do autor do comentario interno.
 */
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

/**
 * Representa um comentario interno associado a uma ocorrencia.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve manter a ligacao entre comentario, autor e ocorrencia de forma consistente.
 */
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

/**
 * Representa o detalhe publico devolvido para uma ocorrencia municipal.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO nao deve expor dados sensiveis do autor da ocorrencia.
 */
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

/**
 * Representa a ocorrencia devolvida ao respetivo proprietario autenticado.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve identificar o proprietario sem expor dados internos de gestao.
 */
export class OwnerOccurrenceResponseDto extends PublicOccurrenceResponseDto {
  @ApiProperty({ example: 7 })
  userId: number;
}

/**
 * Representa uma entrada cronologica do historico de estados de uma ocorrencia.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve preservar a correspondencia entre estado persistido e estado apresentado.
 */
export class OccurrenceStatusHistoryEntryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

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
}

/**
 * Representa o detalhe completo da ocorrencia do proprietario com historico de estados.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve incluir o historico cronologico sem expor comentarios internos de operacao.
 */
export class OwnerOccurrenceDetailResponseDto extends OwnerOccurrenceResponseDto {
  @ApiProperty({ type: [OccurrenceStatusHistoryEntryResponseDto] })
  statusHistory: OccurrenceStatusHistoryEntryResponseDto[];
}

/**
 * Representa o detalhe de ocorrencia devolvido em contexto de operacao interna.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve agregar dados do autor e comentarios internos apenas para utilizadores autorizados.
 */
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

/**
 * Representa a resposta devolvida apos o upload de imagens de ocorrencias.
 * @author Equipa Municipio.360
 * @version 05/04/2026
 * @inv O DTO deve expor apenas as URLs publicas canonicas das imagens carregadas.
 */
export class OccurrenceImageUploadResponseDto {
  @ApiProperty({
    type: [String],
    example: [
      'http://localhost:3000/uploads/occurrences/7/1712310000000-foto-1.jpg',
    ],
  })
  imageUrls: string[];
}
