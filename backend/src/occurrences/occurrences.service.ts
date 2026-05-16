import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  CertificationStatus,
  OccurrenceCategory,
  OccurrenceStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOWED_STATUS_TRANSITIONS,
  INLINE_IMAGE_DATA_URL_PREFIX,
  OCCURRENCE_ERROR_MESSAGES,
} from './constants/occurrence.constants';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import { CreateOccurrenceInternalCommentDto } from './dto/create-occurrence-internal-comment.dto';
import { UpdateOccurrenceDto } from './dto/update-occurrence.dto';
import {
  presentOccurrence,
  presentOccurrences,
  presentOwnerOccurrenceDetail,
} from './presentation/occurrence.presentation';
import {
  assignOccurrenceImagesToOccurrence,
  getOccurrenceImageMetadataByUrl,
  occurrenceImageExistsByUrl,
  occurrenceUploadConfig,
  isOccurrenceUploadPublicUrl,
  removeOccurrenceImagesByUrls,
  saveOccurrenceImages,
  unassignOccurrenceImagesFromOccurrence,
  type UploadedOccurrenceImage,
} from './upload/occurrence-upload';

/**
 * Centraliza a logica de criacao, consulta e gestao de ocorrencias.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 05/04/2026
 * @inv As consultas publicas nao devem expor dados sensiveis do autor das ocorrencias.
 * @inv Cada mudanca valida de estado deve ficar refletida no historico persistido da ocorrencia.
 * @inv O detalhe do proprietario deve devolver o historico cronologico de estados da ocorrencia.
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
   * @return Promise<{ id: number } | null> Utilizador reduzido ou null quando nao existe.
   */
  private async ensureExistingUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, certStatus: true },
    });
  }

  /**
   * Garante que o civil autenticado ja tem conta certificada para submeter ocorrencias.
   * @param user Utilizador reduzido obtido da base de dados.
   * @return void
   */
  private ensureCertifiedCitizenAccount(
    user: { certStatus?: CertificationStatus } | null,
  ) {
    if (user?.certStatus === CertificationStatus.CERTIFIED) return;

    throw new ForbiddenException(OCCURRENCE_ERROR_MESSAGES.accountNotCertified);
  }

  /**
   * Garante que a transicao de estado respeita o fluxo definido para ocorrencias.
   * @param currentStatus Estado atual persistido.
   * @param nextStatus Estado pretendido.
   * @return void Termina silenciosamente quando a transicao e permitida.
   * Pre-condicao: Ambos os estados devem pertencer ao enum de ocorrencias.
   * Pos-condicao: E lancada excecao quando a transicao nao respeita o fluxo definido.
   */
  private ensureAllowedStatusTransition(
    currentStatus: OccurrenceStatus,
    nextStatus: OccurrenceStatus,
  ) {
    if (currentStatus === nextStatus) return;

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (allowedTransitions.includes(nextStatus)) return;

    throw new BadRequestException(
      OCCURRENCE_ERROR_MESSAGES.invalidStatusTransition(
        currentStatus,
        nextStatus,
      ),
    );
  }

  /**
   * Rejeita ficheiros repetidos no mesmo pedido antes de os guardar em disco.
   * @param files Ficheiros recebidos via multipart.
   * @return void Termina silenciosamente quando nao ha duplicados.
   */
  private ensureNoDuplicateUploadedFiles(files: UploadedOccurrenceImage[]) {
    if (files.length < 2) return;

    const fingerprints = files.map((file) =>
      createHash('sha256').update(file.buffer).digest('hex'),
    );

    if (new Set(fingerprints).size !== fingerprints.length) {
      throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.duplicateImage);
    }
  }

  /**
   * Valida URLs publicas de imagens previamente carregadas antes da associacao final.
   * @param imageUrls URLs recebidas no body.
   * @param userId Identificador do utilizador autenticado dono da ocorrencia.
   * @return Promise<string[]> Lista normalizada das URLs aceites para associacao.
   * Pre-condicao: As imagens devem ter sido carregadas previamente pelo endpoint dedicado.
   * Pos-condicao: Sao rejeitadas URLs repetidas, de outros utilizadores ou ja associadas.
   */
  private async normalizeRequestedImageUrls(
    imageUrls: string[] | undefined,
    userId: number,
  ) {
    const normalizedImageUrls = (imageUrls ?? [])
      .map((imageUrl) => imageUrl.trim())
      .filter(Boolean);

    if (!normalizedImageUrls.length) {
      return [];
    }

    if (normalizedImageUrls.length > occurrenceUploadConfig.maxFiles) {
      throw new BadRequestException(
        OCCURRENCE_ERROR_MESSAGES.maxImages(occurrenceUploadConfig.maxFiles),
      );
    }

    if (new Set(normalizedImageUrls).size !== normalizedImageUrls.length) {
      throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.duplicateImage);
    }

    for (const [index, imageUrl] of normalizedImageUrls.entries()) {
      if (INLINE_IMAGE_DATA_URL_PREFIX.test(imageUrl)) {
        throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.inlineImage);
      }

      const imageNumber = index + 1;

      if (!isOccurrenceUploadPublicUrl(imageUrl)) {
        throw new BadRequestException(
          OCCURRENCE_ERROR_MESSAGES.invalidImageFormat(imageNumber),
        );
      }

      const imageMetadata = await getOccurrenceImageMetadataByUrl(imageUrl);
      const imageExists = await occurrenceImageExistsByUrl(imageUrl);

      if (!imageExists || !imageMetadata) {
        throw new BadRequestException(
          OCCURRENCE_ERROR_MESSAGES.unavailableImage(imageNumber),
        );
      }

      if (imageMetadata.ownerUserId !== userId) {
        throw new ForbiddenException(
          OCCURRENCE_ERROR_MESSAGES.imageNotOwned(imageNumber),
        );
      }

      if (imageMetadata.occurrenceId !== null) {
        throw new BadRequestException(
          OCCURRENCE_ERROR_MESSAGES.imageAlreadyAssigned(imageNumber),
        );
      }
    }

    return normalizedImageUrls;
  }

  /**
   * Junta as URLs previamente carregadas enviadas no campo canonico e no alias legado.
   * @param dto DTO de criacao recebido do pedido.
   * @return string[] Lista bruta de URLs pedidas pelo cliente.
   */
  private getRequestedImageUrls(dto: CreateOccurrenceDto) {
    return [...(dto.uploadedImageUrls ?? []), ...(dto.imageUrls ?? [])];
  }

  /**
   * Indica se a categoria exige evidencia fotografica no momento da submissao.
   * @param category Categoria selecionada pelo cidadao.
   * @return boolean Verdadeiro quando a ocorrencia deve trazer pelo menos uma fotografia.
   */
  private isImageRequiredForCategory(category: OccurrenceCategory) {
    return category !== OccurrenceCategory.RUIDO;
  }

  /**
   * Persiste uma entrada de historico com o estado atualmente assumido pela ocorrencia.
   * @param prisma Cliente transacional usado na operacao atomica.
   * @param occurrenceId Identificador da ocorrencia alterada.
   * @param status Estado que passou a vigorar.
   * @param changedByUserId Utilizador responsavel pela mudanca, quando conhecido.
   * @return Promise<void> Promessa resolvida apos inserir a linha de historico.
   * Pre-condicao: A ocorrencia ja deve existir e a transacao deve permanecer ativa.
   * Pos-condicao: Fica registada uma linha cronologica para o estado indicado.
   */
  private async createStatusHistoryEntry(
    prisma: Prisma.TransactionClient,
    occurrenceId: number,
    status: OccurrenceStatus,
    changedByUserId?: number,
  ) {
    if (changedByUserId) {
      await prisma.$executeRaw`
        INSERT INTO "OccurrenceStatusHistory" ("occurrenceId", "status", "changedByUserId")
        VALUES (${occurrenceId}, CAST(${status} AS "OccurrenceStatus"), ${changedByUserId})
      `;
      return;
    }

    await prisma.$executeRaw`
      INSERT INTO "OccurrenceStatusHistory" ("occurrenceId", "status")
      VALUES (${occurrenceId}, CAST(${status} AS "OccurrenceStatus"))
    `;
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
   * Define os campos devolvidos no historico de estados de uma ocorrencia.
   * @return Selecao Prisma com os campos do historico.
   */
  private getStatusHistorySelect() {
    return {
      id: true,
      status: true,
      createdAt: true,
    } as const;
  }

  /**
   * Define os campos devolvidos no detalhe do proprietario com historico de estados.
   * @return Selecao Prisma com os campos do detalhe e respetivo historico.
   */
  private getOwnerDetailSelect() {
    return {
      ...this.getOwnerSelect(),
      statusHistory: {
        orderBy: {
          createdAt: 'asc',
        },
        select: this.getStatusHistorySelect(),
      },
    } as const;
  }

  /**
   * Define os campos devolvidos nos comentarios internos de ocorrencias.
   * @return Selecao Prisma com dados do comentario e autor.
   */
  private getInternalCommentSelect() {
    return {
      id: true,
      content: true,
      occurrenceId: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
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
      internalComments: {
        orderBy: {
          createdAt: 'asc',
        },
        select: this.getInternalCommentSelect(),
      },
    } as const;
  }

  /**
   * Indica se a role autenticada pode gerir qualquer ocorrencia.
   * @param role Role autenticada no pedido.
   * @return boolean Verdadeiro para perfis de backoffice.
   */
  private isBackofficeRole(role: Role) {
    return role === Role.OPERADOR || role === Role.ADMINISTRADOR;
  }

  /**
   * Cria uma ocorrencia para um utilizador autenticado e fecha a associacao final das imagens.
   * @param userId Identificador do utilizador autor.
   * @param dto Dados da ocorrencia.
   * @param files Ficheiros enviados no pedido multipart.
   * @return Ocorrencia criada.
   * Pre-condicao: As imagens referenciadas no body devem pertencer ao utilizador autenticado.
   * Pos-condicao: A ocorrencia nasce com estado SUBMETIDA e com a respetiva entrada inicial no historico.
   * Pos-condicao: As novas imagens ficam marcadas como associadas apenas se a ocorrencia for criada com sucesso.
   */
  async create(
    userId: number,
    dto: CreateOccurrenceDto,
    files: UploadedOccurrenceImage[] = [],
  ) {
    const user = await this.ensureExistingUser(userId);
    if (!user) {
      throw new UnauthorizedException(
        OCCURRENCE_ERROR_MESSAGES.invalidAuthenticatedUser,
      );
    }
    this.ensureCertifiedCitizenAccount(user);

    const location = dto.location?.trim() ?? '';
    const description = dto.description?.trim() ?? '';
    const otherCategoryDetail =
      dto.category === OccurrenceCategory.OUTROS
        ? dto.otherCategoryDetail?.trim() ?? ''
        : null;
    if (!location) {
      throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.locationRequired);
    }

    if (dto.category === OccurrenceCategory.OUTROS && !otherCategoryDetail) {
      throw new BadRequestException(
        OCCURRENCE_ERROR_MESSAGES.otherCategoryRequired,
      );
    }

    this.ensureNoDuplicateUploadedFiles(files);

    const requestedImageUrls = await this.normalizeRequestedImageUrls(
      this.getRequestedImageUrls(dto),
      userId,
    );

    if (
      requestedImageUrls.length + files.length >
      occurrenceUploadConfig.maxFiles
    ) {
      throw new BadRequestException(
        OCCURRENCE_ERROR_MESSAGES.maxImages(occurrenceUploadConfig.maxFiles),
      );
    }

    if (
      this.isImageRequiredForCategory(dto.category) &&
      requestedImageUrls.length + files.length === 0
    ) {
      throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.imageRequired);
    }

    const uploadedImageUrls = files.length
      ? await saveOccurrenceImages(files, userId)
      : [];
    const imageUrls = [...requestedImageUrls, ...uploadedImageUrls];
    const initialStatus = OccurrenceStatus.SUBMETIDA;
    let createdOccurrenceId: number | null = null;

    try {
      const occurrence = await this.prisma.$transaction(async (tx) => {
        const createdOccurrence = await tx.occurrence.create({
          data: {
            category: dto.category,
            otherCategoryDetail,
            description,
            location,
            imageUrls,
            status: initialStatus,
            userId,
          },
          select: this.getOwnerSelect(),
        });

        await this.createStatusHistoryEntry(
          tx,
          createdOccurrence.id,
          initialStatus,
          userId,
        );

        return createdOccurrence;
      });
      createdOccurrenceId = occurrence.id;
      if (imageUrls.length) {
        await assignOccurrenceImagesToOccurrence(imageUrls, occurrence.id);
      }

      return presentOccurrence(occurrence);
    } catch (error) {
      if (createdOccurrenceId !== null && imageUrls.length) {
        await unassignOccurrenceImagesFromOccurrence(
          imageUrls,
          createdOccurrenceId,
        );
      }
      if (createdOccurrenceId !== null) {
        await this.prisma.occurrence
          .delete({
            where: { id: createdOccurrenceId },
          })
          .catch(() => undefined);
      }
      if (uploadedImageUrls.length) {
        await removeOccurrenceImagesByUrls(uploadedImageUrls);
      }
      throw error;
    }
  }

  /**
   * Guarda fotografias avulsas para posterior anexo a uma ocorrencia.
   * @param userId Identificador do utilizador autenticado.
   * @param files Ficheiros recebidos no pedido multipart.
   * @return {{ imageUrls: string[] }} URLs publicas das imagens guardadas.
   * Pos-condicao: Cada imagem fica registada com metadata privada do respetivo owner.
   */
  async uploadImages(userId: number, files: UploadedOccurrenceImage[] = []) {
    const user = await this.ensureExistingUser(userId);
    if (!user) {
      throw new UnauthorizedException(
        OCCURRENCE_ERROR_MESSAGES.invalidAuthenticatedUser,
      );
    }
    this.ensureCertifiedCitizenAccount(user);

    if (!files.length) {
      throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.noUploadFiles);
    }

    this.ensureNoDuplicateUploadedFiles(files);

    const imageUrls = await saveOccurrenceImages(files, userId);

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

    return presentOccurrences(occurrences);
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

    return presentOccurrences(occurrences);
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
      throw new NotFoundException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotFound);
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
      throw new NotFoundException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotFound);
    }

    if (occurrence.userId !== userId) {
      throw new ForbiddenException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotOwned);
    }

    return occurrence;
  }

  /**
   * Devolve o detalhe de uma ocorrencia do utilizador autenticado.
   * @param id Identificador da ocorrencia.
   * @param userId Identificador do utilizador autenticado.
   * @return Ocorrencia pertencente ao utilizador com historico de estados.
   * Pre-condicao: A ocorrencia deve existir e pertencer ao utilizador autenticado.
   * Pos-condicao: A resposta inclui o historico cronologico de estados sem expor dados internos de gestao.
   */
  async findMineById(id: number, userId: number) {
    await this.findOneOwned(id, userId);

    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      select: this.getOwnerDetailSelect(),
    });

    if (!occurrence) {
      throw new NotFoundException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotFound);
    }

    return presentOwnerOccurrenceDetail(occurrence);
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
      throw new NotFoundException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotFound);
    }

    return occurrence;
  }

  /**
   * Lista os comentarios internos de uma ocorrencia existente.
   * @param occurrenceId Identificador da ocorrencia.
   * @return Lista cronologica de comentarios internos.
   */
  async listInternalComments(occurrenceId: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id: occurrenceId },
      select: {
        id: true,
        internalComments: {
          orderBy: { createdAt: 'asc' },
          select: this.getInternalCommentSelect(),
        },
      },
    });

    if (!occurrence) {
      throw new NotFoundException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotFound);
    }

    return occurrence.internalComments;
  }

  /**
   * Cria um comentario interno associado a uma ocorrencia existente.
   * @param occurrenceId Identificador da ocorrencia.
   * @param userId Identificador do utilizador autenticado que comenta.
   * @param dto Conteudo do comentario.
   * @return Comentario interno criado com dados reduzidos do autor.
   */
  async createInternalComment(
    occurrenceId: number,
    userId: number,
    dto: CreateOccurrenceInternalCommentDto,
  ) {
    await this.findOneForOperator(occurrenceId);

    const user = await this.ensureExistingUser(userId);
    if (!user) {
      throw new UnauthorizedException(
        OCCURRENCE_ERROR_MESSAGES.invalidAuthenticatedUser,
      );
    }

    const occurrence = await this.prisma.occurrence.update({
      where: { id: occurrenceId },
      data: {
        internalComments: {
          create: {
            userId,
            content: dto.content.trim(),
          },
        },
      },
      select: {
        internalComments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: this.getInternalCommentSelect(),
        },
      },
    });

    const [createdComment] = occurrence.internalComments;
    if (!createdComment) {
      throw new BadRequestException(
        OCCURRENCE_ERROR_MESSAGES.internalCommentFailed,
      );
    }

    return createdComment;
  }

  /**
   * Atualiza os campos editaveis de uma ocorrencia existente sem alterar o estado.
   * @param id Identificador da ocorrencia.
   * @param dto Dados editaveis recebidos no pedido.
   * @param userId Identificador do utilizador autenticado.
   * @param role Role autenticada no pedido.
   * @return Ocorrencia atualizada.
   */
  async updateOccurrence(
    id: number,
    dto: UpdateOccurrenceDto,
    userId: number,
    role: Role,
  ) {
    const occurrence = await this.findOneForOperator(id);
    const isBackoffice = this.isBackofficeRole(role);

    if (!isBackoffice && occurrence.userId !== userId) {
      throw new ForbiddenException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotOwned);
    }

    const location = dto.location.trim();
    const description = dto.description?.trim() ?? '';
    const otherCategoryDetail =
      dto.category === OccurrenceCategory.OUTROS
        ? dto.otherCategoryDetail?.trim() ?? ''
        : null;

    if (!location) {
      throw new BadRequestException(OCCURRENCE_ERROR_MESSAGES.locationRequired);
    }

    if (dto.category === OccurrenceCategory.OUTROS && !otherCategoryDetail) {
      throw new BadRequestException(
        OCCURRENCE_ERROR_MESSAGES.otherCategoryRequired,
      );
    }

    return this.prisma.occurrence.update({
      where: { id },
      data: {
        category: dto.category,
        otherCategoryDetail,
        location,
        description,
      },
      select: isBackoffice ? this.getOperatorSelect() : this.getOwnerSelect(),
    });
  }

  /**
   * Atualiza o estado de uma ocorrencia existente.
   * @param id Identificador da ocorrencia.
   * @param status Novo estado da ocorrencia.
   * @param changedByUserId Utilizador autenticado que pediu a mudanca.
   * @return Ocorrencia atualizada, ou a ocorrencia atual quando nao ha mudanca real.
   * Pre-condicao: A ocorrencia deve existir e a transicao pedida deve ser permitida.
   * Pos-condicao: Quando o estado muda, a ocorrencia e o historico sao persistidos atomicamente.
   * Pos-condicao: Quando o estado pedido coincide com o atual, nao e criada entrada duplicada de historico.
   */
  async updateStatus(
    id: number,
    status: OccurrenceStatus,
    changedByUserId?: number,
  ) {
    const occurrence = await this.findOneForOperator(id);

    if (occurrence.status === status) {
      return occurrence;
    }

    this.ensureAllowedStatusTransition(occurrence.status, status);

    return this.prisma.$transaction(async (tx) => {
      const updatedOccurrence = await tx.occurrence.update({
        where: { id },
        data: { status },
        select: this.getOperatorSelect(),
      });

      await this.createStatusHistoryEntry(tx, id, status, changedByUserId);

      return updatedOccurrence;
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
      throw new NotFoundException(OCCURRENCE_ERROR_MESSAGES.occurrenceNotFound);
    }

    return presentOccurrence(occurrence);
  }
}
