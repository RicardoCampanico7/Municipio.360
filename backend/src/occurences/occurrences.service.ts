import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CertificationStatus,
  OccurrenceCategory,
  OccurrenceStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const IMAGE_DATA_URL_PREFIX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const ALLOWED_STATUS_TRANSITIONS: Record<
  OccurrenceStatus,
  readonly OccurrenceStatus[]
> = {
  [OccurrenceStatus.SUBMETIDA]: [
    OccurrenceStatus.EM_TRATAMENTO,
    OccurrenceStatus.CONCLUIDA,
  ],
  [OccurrenceStatus.EM_TRATAMENTO]: [OccurrenceStatus.CONCLUIDA],
  [OccurrenceStatus.CONCLUIDA]: [],
};

/**
 * Centraliza a logica de criacao, consulta e gestao de ocorrencias.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv As consultas publicas nao devem expor dados sensiveis do autor das ocorrencias.
 */
@Injectable()
export class OccurrencesService {
  /**
   * Recebe o servico de persistencia usado nas operacoes de ocorrencias.
   * @param prisma Servico Prisma da aplicacao.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garante que o utilizador autenticado ainda existe antes de criar registos dependentes.
   * @param userId Identificador do utilizador autenticado.
   * @return Promise<void> Promessa resolvida quando o utilizador existe.
   */
  private async ensureExistingUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, certStatus: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    return user;
  }

  /**
   * Garante que apenas utilizadores certificados podem submeter ocorrencias.
   * @param userId Identificador do utilizador autenticado.
   * @return Promise<void> Promessa resolvida quando o utilizador esta certificado.
   */
  private async ensureCertifiedUser(userId: number) {
    const user = await this.ensureExistingUser(userId);

    if (user.certStatus !== CertificationStatus.CERTIFIED) {
      throw new ForbiddenException(
        'Apenas cidadaos certificados podem submeter ocorrencias',
      );
    }
  }

  /**
   * Valida que as imagens recebidas sao data URLs de imagem e respeitam o limite real de tamanho.
   * @param imageUrls Lista de imagens recebidas no pedido.
   * @return Promise<void> Promessa resolvida quando todas as imagens sao validas.
   */
  private validateImages(imageUrls: string[]) {
    imageUrls.forEach((imageUrl, index) => {
      if (!IMAGE_DATA_URL_PREFIX.test(imageUrl)) {
        throw new BadRequestException(
          `A fotografia ${index + 1} nao tem um formato valido`,
        );
      }

      const base64Payload = imageUrl.replace(IMAGE_DATA_URL_PREFIX, '');

      let sizeInBytes = 0;
      try {
        sizeInBytes = Buffer.from(base64Payload, 'base64').byteLength;
      } catch {
        throw new BadRequestException(
          `A fotografia ${index + 1} nao tem um formato valido`,
        );
      }

      if (sizeInBytes > MAX_IMAGE_SIZE_BYTES) {
        throw new BadRequestException(
          `A fotografia ${index + 1} excede 3 MB`,
        );
      }
    });
  }

  /**
   * Garante que a transicao de estado respeita o fluxo definido para ocorrencias.
   * @param currentStatus Estado atual persistido.
   * @param nextStatus Estado pretendido.
   * @return Promise<void> Promessa resolvida quando a transicao e permitida.
   */
  private ensureAllowedStatusTransition(
    currentStatus: OccurrenceStatus,
    nextStatus: OccurrenceStatus,
  ) {
    if (currentStatus === nextStatus) return;

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (allowedTransitions.includes(nextStatus)) return;

    throw new BadRequestException(
      `Transicao de estado invalida: ${currentStatus} -> ${nextStatus}`,
    );
  }

  /**
   * Define os campos publicos devolvidos nas respostas de ocorrencias.
   * @return Selecao Prisma com os campos publicos.
   */
  private getPublicSelect() {
    return {
      id: true,
      category: true,
      otherCategoryDetail: true,
      description: true,
      location: true,
      imageUrls: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }

  /**
   * Define os campos devolvidos ao proprietario da ocorrencia.
   * @return Selecao Prisma com os campos do proprietario.
   */
  private getOwnerSelect() {
    return {
      ...this.getPublicSelect(),
      userId: true,
    } as const;
  }

  /**
   * Define os campos devolvidos em contexto de operacao interna.
   * @return Selecao Prisma com dados da ocorrencia e do autor.
   */
  private getOperatorSelect() {
    return {
      ...this.getOwnerSelect(),
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          postalCode: true,
          role: true,
          certStatus: true,
        },
      },
    } as const;
  }

  /**
   * Cria uma ocorrencia para um utilizador autenticado.
   * @param userId Identificador do utilizador autor.
   * @param dto Dados da ocorrencia.
   * @return Ocorrencia criada.
   */
  async create(userId: number, dto: CreateOccurrenceDto) {
    await this.ensureCertifiedUser(userId);
    this.validateImages(dto.imageUrls);

    const otherCategoryDetail =
      dto.category === OccurrenceCategory.OUTROS
        ? dto.otherCategoryDetail?.trim()
        : null;

    return this.prisma.occurrence.create({
      data: {
        category: dto.category,
        otherCategoryDetail,
        description: dto.description?.trim() ?? '',
        location: dto.location,
        imageUrls: dto.imageUrls,
        status: OccurrenceStatus.SUBMETIDA,
        userId,
      },
      select: this.getOwnerSelect(),
    });
  }

  /**
   * Lista todas as ocorrencias publicas.
   * @return Lista publica de ocorrencias ordenada por data de criacao.
   */
  async findAll() {
    return this.prisma.occurrence.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.getPublicSelect(),
    });
  }

  /**
   * Lista as ocorrencias de um utilizador especifico.
   * @param userId Identificador do utilizador.
   * @return Lista de ocorrencias do utilizador.
   */
  async findMine(userId: number) {
    return this.prisma.occurrence.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: this.getOwnerSelect(),
    });
  }

  /**
   * Procura uma ocorrencia pelo identificador incluindo o autor.
   * @param id Identificador da ocorrencia.
   * @return Ocorrencia encontrada.
   */
  async findOne(id: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    return occurrence;
  }

  /**
   * Garante que uma ocorrencia pertence ao utilizador autenticado.
   * @param id Identificador da ocorrencia.
   * @param userId Identificador do utilizador.
   * @return Ocorrencia encontrada e pertencente ao utilizador.
   */
  async findOneOwned(id: number, userId: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    if (occurrence.userId !== userId) {
      throw new ForbiddenException('Not your occurrence');
    }

    return occurrence;
  }

  /**
   * Devolve o detalhe de uma ocorrencia do utilizador autenticado.
   * @param id Identificador da ocorrencia.
   * @param userId Identificador do utilizador autenticado.
   * @return Ocorrencia pertencente ao utilizador.
   */
  async findMineById(id: number, userId: number) {
    await this.findOneOwned(id, userId);

    return this.prisma.occurrence.findUnique({
      where: { id },
      select: this.getOwnerSelect(),
    });
  }

  /**
   * Lista todas as ocorrencias em contexto de gestao por operador.
   * @return Lista de ocorrencias com dados do autor.
   */
  async findAllForOperator() {
    return this.prisma.occurrence.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.getOperatorSelect(),
    });
  }

  /**
   * Obtem o detalhe de uma ocorrencia para uso interno.
   * @param id Identificador da ocorrencia.
   * @return Detalhe da ocorrencia com dados do autor.
   */
  async findOneForOperator(id: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      select: this.getOperatorSelect(),
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    return occurrence;
  }

  /**
   * Atualiza o estado de uma ocorrencia existente.
   * @param id Identificador da ocorrencia.
   * @param status Novo estado da ocorrencia.
   * @return Ocorrencia atualizada.
   */
  async updateStatus(id: number, status: OccurrenceStatus) {
    const occurrence = await this.findOne(id);
    this.ensureAllowedStatusTransition(occurrence.status, status);

    return this.prisma.occurrence.update({
      where: { id },
      data: { status },
      select: this.getOperatorSelect(),
    });
  }

  /**
   * Remove uma ocorrencia existente.
   * @param id Identificador da ocorrencia.
   * @return Ocorrencia removida.
   */
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.occurrence.delete({
      where: { id },
      select: this.getOperatorSelect(),
    });
  }

  /**
   * Obtem o detalhe publico de uma ocorrencia.
   * @param id Identificador da ocorrencia.
   * @return Dados publicos da ocorrencia.
   */
  async findOnePublic(id: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      select: this.getPublicSelect(),
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    return occurrence;
  }
}
