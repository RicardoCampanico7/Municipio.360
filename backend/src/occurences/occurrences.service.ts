import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';

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
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }
  }

  /**
   * Define os campos publicos devolvidos nas respostas de ocorrencias.
   * @return Selecao Prisma com os campos publicos.
   */
  private getPublicSelect() {
    return {
      id: true,
      category: true,
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
    await this.ensureExistingUser(userId);

    return this.prisma.occurrence.create({
      data: {
        category: dto.category,
        description: dto.description,
        location: dto.location,
        imageUrls: dto.imageUrls ?? [],
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
    await this.findOne(id);

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
