import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import {
  occurrenceUploadConfig,
  removeOccurrenceImagesByUrls,
  saveOccurrenceImages,
  type UploadedOccurrenceImage,
} from './occurrence-upload';
const OCCURRENCE_CATEGORY_LABELS: Record<OccurrenceCategory, string> = {
  [OccurrenceCategory.BURACOS_PAVIMENTO]: 'Buracos no pavimento',
  [OccurrenceCategory.ILUMINACAO_PUBLICA]: 'Iluminacao publica',
  [OccurrenceCategory.LIMPEZA_URBANA]: 'Limpeza urbana',
  [OccurrenceCategory.RUIDO]: 'Ruido',
  [OccurrenceCategory.ESPACOS_PUBLICOS]: 'Espacos publicos',
  [OccurrenceCategory.SINALIZACAO]: 'Sinalizacao',
  [OccurrenceCategory.OUTROS]: 'Outros',
};
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

type PresentableOccurrence = {
  category: OccurrenceCategory;
  otherCategoryDetail: string | null;
  status: OccurrenceStatus;
};

type PresentedOccurrence<T extends PresentableOccurrence> = Omit<
  T,
  'category' | 'status'
> & {
  title: string;
  category: string;
  categoryKey: OccurrenceCategory;
  status: string;
  statusKey: OccurrenceStatus;
};

/**
 * Centraliza a logica de criacao, consulta e gestao de ocorrencias.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 19/03/2026
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
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
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
   * Converte o estado persistido para um valor estavel compativel com o frontend atual.
   * @param status Estado persistido no enum.
   * @return Estado apresentado ao cliente.
   */
  private getPresentationStatus(status: OccurrenceStatus) {
    switch (status) {
      case OccurrenceStatus.CONCLUIDA:
        return 'resolved';
      case OccurrenceStatus.EM_TRATAMENTO:
        return 'progress';
      case OccurrenceStatus.SUBMETIDA:
      default:
        return 'open';
    }
  }

  /**
   * Produz o texto legivel apresentado como titulo/categoria para o utilizador final.
   * @param category Categoria persistida.
   * @param otherCategoryDetail Detalhe livre quando a categoria e OUTROS.
   * @return Texto legivel da ocorrencia.
   */
  private getPresentationCategory(
    category: OccurrenceCategory,
    otherCategoryDetail: string | null,
  ) {
    if (category === OccurrenceCategory.OUTROS) {
      const customLabel = otherCategoryDetail?.trim();
      if (customLabel) return customLabel;
    }

    return OCCURRENCE_CATEGORY_LABELS[category];
  }

  /**
   * Garante que fotografias sao enviadas apenas como ficheiros multipart/form-data.
   * @param imageUrls Referencias recebidas indevidamente no body.
   * @return void
   */
  private ensureImagesAreProvidedAsFiles(imageUrls: string[] | undefined) {
    const normalizedImageUrls = (imageUrls ?? [])
      .map((imageUrl) => imageUrl.trim())
      .filter(Boolean);

    if (!normalizedImageUrls.length) {
      return;
    }

    if (normalizedImageUrls.length > occurrenceUploadConfig.maxFiles) {
      throw new BadRequestException(
        `Pode enviar no maximo ${occurrenceUploadConfig.maxFiles} fotografias`,
      );
    }

    throw new BadRequestException(
      'As fotografias devem ser enviadas como ficheiros em multipart/form-data',
    );
  }

  /**
   * Ajusta a resposta de uma ocorrencia para os campos legiveis esperados pelo frontend atual.
   * @param occurrence Ocorrencia persistida.
   * @return Ocorrencia pronta para consumo pelo cliente.
   */
  private presentOccurrence<T extends PresentableOccurrence>(
    occurrence: T,
  ): PresentedOccurrence<T> {
    const title = this.getPresentationCategory(
      occurrence.category,
      occurrence.otherCategoryDetail,
    );

    return {
      ...occurrence,
      title,
      categoryKey: occurrence.category,
      statusKey: occurrence.status,
      category: title,
      status: this.getPresentationStatus(occurrence.status),
    };
  }

  /**
   * Ajusta uma lista de ocorrencias para o formato apresentado ao cliente.
   * @param occurrences Lista persistida.
   * @return Lista pronta para consumo pelo cliente.
   */
  private presentOccurrences<T extends PresentableOccurrence>(
    occurrences: T[],
  ) {
    return occurrences.map((occurrence) => this.presentOccurrence(occurrence));
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
  async create(
    userId: number,
    dto: CreateOccurrenceDto,
    files: UploadedOccurrenceImage[] = [],
  ) {
    const user = await this.ensureExistingUser(userId);
    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    const otherCategoryDetail =
      dto.category === OccurrenceCategory.OUTROS
        ? dto.otherCategoryDetail?.trim()
        : null;
    this.ensureImagesAreProvidedAsFiles(dto.imageUrls);
    const uploadedImageUrls = await saveOccurrenceImages(files);
    const imageUrls = uploadedImageUrls;

    try {
      const occurrence = await this.prisma.occurrence.create({
        data: {
          category: dto.category,
          otherCategoryDetail,
          description: dto.description?.trim() ?? '',
          location: dto.location,
          imageUrls,
          status: OccurrenceStatus.SUBMETIDA,
          userId,
        },
        select: this.getOwnerSelect(),
      });

      return this.presentOccurrence(occurrence);
    } catch (error) {
      await removeOccurrenceImagesByUrls(uploadedImageUrls);
      throw error;
    }
  }

  /**
   * Guarda fotografias avulsas para posterior anexo a uma ocorrencia.
   * @param userId Identificador do utilizador autenticado.
   * @param files Ficheiros recebidos no pedido multipart.
   * @return URLs publicas das imagens guardadas.
   */
  async uploadImages(userId: number, files: UploadedOccurrenceImage[] = []) {
    const user = await this.ensureExistingUser(userId);
    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    if (!files.length) {
      throw new BadRequestException('Envie pelo menos uma fotografia');
    }

    const imageUrls = await saveOccurrenceImages(files);

    return {
      imageUrls,
    };
  }

  /**
   * Lista todas as ocorrencias publicas.
   * @return Lista publica de ocorrencias ordenada por data de criacao.
   */
  async findAll() {
    const occurrences = await this.prisma.occurrence.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.getPublicSelect(),
    });

    return this.presentOccurrences(occurrences);
  }

  /**
   * Lista as ocorrencias de um utilizador especifico.
   * @param userId Identificador do utilizador.
   * @return Lista de ocorrencias do utilizador.
   */
  async findMine(userId: number) {
    const occurrences = await this.prisma.occurrence.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: this.getOwnerSelect(),
    });

    return this.presentOccurrences(occurrences);
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

    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      select: this.getOwnerSelect(),
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    return this.presentOccurrence(occurrence);
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

    return this.presentOccurrence(occurrence);
  }
}
