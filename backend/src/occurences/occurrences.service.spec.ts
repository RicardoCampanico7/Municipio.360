import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { OccurrencesService } from './occurrences.service';

const SMALL_IMAGE_DATA_URL =
  'data:image/png;base64,' + Buffer.from('small-image').toString('base64');
const LARGE_IMAGE_DATA_URL =
  'data:image/png;base64,' +
  Buffer.alloc(3 * 1024 * 1024 + 1, 1).toString('base64');

/**
 * Valida os dados visiveis e a ausencia de dados sensiveis nas respostas publicas.
 */
describe('OccurrencesService', () => {
  let service: OccurrencesService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    occurrence: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      occurrence: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccurrencesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OccurrencesService>(OccurrencesService);
  });

  /**
   * Garante que a listagem publica usa apenas campos visiveis da ocorrencia.
   * @return void
   */
  it('should request only visible fields when listing public occurrences', async () => {
    prisma.occurrence.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prisma.occurrence.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        otherCategoryDetail: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(prisma.occurrence.findMany.mock.calls[0][0].select).not.toHaveProperty('user');
    expect(prisma.occurrence.findMany.mock.calls[0][0].select).not.toHaveProperty('userId');
  });

  /**
   * Garante que o detalhe publico nao tenta expor dados do autor.
   * @return void
   */
  it('should request only visible fields on public occurrence detail', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 1,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Candeeiro apagado',
      location: 'Rua A',
      imageUrls: [],
      status: 'SUBMETIDA',
      createdAt: new Date('2026-03-17T09:00:00.000Z'),
      updatedAt: new Date('2026-03-17T09:00:00.000Z'),
    });

    const result = await service.findOnePublic(1);

    expect(prisma.occurrence.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        category: true,
        otherCategoryDetail: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('user');
  });

  /**
   * Garante que a criacao nao devolve erro interno quando o utilizador autenticado nao existe.
   * @return void
   */
  it('should throw unauthorized instead of causing a 500 when creating with an invalid user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(999, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        description: 'Candeeiro apagado',
        location: 'Rua A',
        imageUrls: [SMALL_IMAGE_DATA_URL],
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: { id: true },
    });
    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que um utilizador autenticado com conta criada pode submeter ocorrencias.
   * @return void
   */
  it('should allow occurrence creation for an authenticated citizen account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    prisma.occurrence.create.mockResolvedValue({ id: 2 });

    await service.create(7, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
      imageUrls: [SMALL_IMAGE_DATA_URL],
    });

    expect(prisma.occurrence.create).toHaveBeenCalled();
  });

  /**
   * Garante que a criacao valida o tamanho real das fotografias recebidas.
   * @return void
   */
  it('should reject images whose decoded payload exceeds the backend limit', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: [LARGE_IMAGE_DATA_URL],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que a criacao associa a ocorrencia ao utilizador autenticado e define o estado inicial.
   * @return void
   */
  it('should create an occurrence with authenticated user and initial submitted status', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
    });
    prisma.occurrence.create.mockResolvedValue({ id: 1 });

    await service.create(12, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: ' Rua A ',
      description: '  Candeeiro apagado  ',
      imageUrls: [SMALL_IMAGE_DATA_URL],
    });

    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        otherCategoryDetail: null,
        description: 'Candeeiro apagado',
        location: ' Rua A ',
        imageUrls: [SMALL_IMAGE_DATA_URL],
        status: OccurrenceStatus.SUBMETIDA,
        userId: 12,
      },
      select: {
        id: true,
        category: true,
        otherCategoryDetail: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
  });

  /**
   * Garante que transicoes de estado regressivas sao rejeitadas.
   * @return void
   */
  it('should reject invalid backward status transitions', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 1,
      status: OccurrenceStatus.CONCLUIDA,
      user: { id: 10 },
    });

    await expect(
      service.updateStatus(1, OccurrenceStatus.SUBMETIDA),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.occurrence.update).not.toHaveBeenCalled();
  });
});
