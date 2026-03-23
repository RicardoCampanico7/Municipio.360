import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  removeOccurrenceImagesByUrls,
  saveOccurrenceImages,
} from './occurrence-upload';
import { OccurrencesService } from './occurrences.service';

jest.mock('./occurrence-upload', () => ({
  occurrenceUploadConfig: {
    maxFiles: 3,
    maxFileSizeBytes: 3 * 1024 * 1024,
    uploadsRoot: '/tmp/occurrences',
    publicBasePath: '/uploads/occurrences',
  },
  saveOccurrenceImages: jest.fn(),
  removeOccurrenceImagesByUrls: jest.fn(),
}));

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
    jest.clearAllMocks();
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
    prisma.occurrence.findMany.mockResolvedValue([
      {
        id: 1,
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        otherCategoryDetail: null,
        description: 'Candeeiro apagado',
        location: 'Rua A',
        imageUrls: [],
        status: OccurrenceStatus.SUBMETIDA,
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ]);

    const result = await service.findAll();

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
    expect(
      prisma.occurrence.findMany.mock.calls[0][0].select,
    ).not.toHaveProperty('user');
    expect(
      prisma.occurrence.findMany.mock.calls[0][0].select,
    ).not.toHaveProperty('userId');
    expect(result).toEqual([
      expect.objectContaining({
        title: 'Iluminacao publica',
        category: 'Iluminacao publica',
        categoryKey: OccurrenceCategory.ILUMINACAO_PUBLICA,
        status: 'open',
        statusKey: OccurrenceStatus.SUBMETIDA,
      }),
    ]);
  });

  /**
   * Garante que o detalhe publico nao tenta expor dados do autor.
   * @return void
   */
  it('should request only visible fields on public occurrence detail', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 1,
      category: OccurrenceCategory.SINALIZACAO,
      otherCategoryDetail: null,
      description: 'Sinal tombado',
      location: 'Rua A',
      imageUrls: [],
      status: OccurrenceStatus.EM_TRATAMENTO,
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
    expect(result).toEqual(
      expect.objectContaining({
        title: 'Sinalizacao',
        category: 'Sinalizacao',
        categoryKey: OccurrenceCategory.SINALIZACAO,
        status: 'progress',
        statusKey: OccurrenceStatus.EM_TRATAMENTO,
      }),
    );
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
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: { id: true },
    });
    expect(saveOccurrenceImages).not.toHaveBeenCalled();
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
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([
      '/uploads/occurrences/a.png',
    ]);
    prisma.occurrence.create.mockResolvedValue({
      id: 2,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: '',
      location: 'Rua A',
      imageUrls: ['/uploads/occurrences/a.png'],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 7,
    });

    const result = await service.create(
      7,
      {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
      },
      [
        {
          buffer: Buffer.from('img'),
          mimetype: 'image/png',
          originalname: 'photo.png',
          size: 3,
        },
      ],
    );

    expect(prisma.occurrence.create).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        title: 'Iluminacao publica',
        status: 'open',
      }),
    );
  });

  /**
   * Garante que imagens opcionais podem ser omitidas sem bloquear a criacao.
   * @return void
   */
  it('should create an occurrence without images', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([]);
    prisma.occurrence.create.mockResolvedValue({
      id: 3,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: '',
      location: 'Rua A',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 7,
    });

    const result = await service.create(7, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
    });

    expect(saveOccurrenceImages).toHaveBeenCalledWith([]);
    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrls: [],
      }),
      select: expect.any(Object),
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: 'open',
      }),
    );
  });

  /**
   * Garante que a criacao rejeita fotografias enviadas como strings no body.
   * @return void
   */
  it('should reject image references sent in the request body', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([]);

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: ['data:image/png;base64,ZmFrZQ=='],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que o endpoint dedicado devolve URLs publicas quando recebe imagens validas.
   * @return void
   */
  it('should upload occurrence images for a valid authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([
      '/uploads/occurrences/uploaded.png',
    ]);

    const result = await service.uploadImages(7, [
      {
        buffer: Buffer.from('img'),
        mimetype: 'image/png',
        originalname: 'uploaded.png',
        size: 3,
      },
    ]);

    expect(saveOccurrenceImages).toHaveBeenCalledWith([
      expect.objectContaining({
        originalname: 'uploaded.png',
      }),
    ]);
    expect(result).toEqual({
      imageUrls: ['/uploads/occurrences/uploaded.png'],
    });
  });

  /**
   * Garante que o upload dedicado rejeita pedidos sem fotografias.
   * @return void
   */
  it('should reject dedicated image upload requests without files', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });

    await expect(service.uploadImages(7, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(saveOccurrenceImages).not.toHaveBeenCalled();
  });

  /**
   * Garante que falhas a persistir a ocorrencia limpam as imagens ja guardadas.
   * @return void
   */
  it('should remove saved images when database creation fails', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([
      '/uploads/occurrences/fail.png',
    ]);
    prisma.occurrence.create.mockRejectedValue(new Error('db failure'));

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
      }),
    ).rejects.toThrow('db failure');

    expect(removeOccurrenceImagesByUrls).toHaveBeenCalledWith([
      '/uploads/occurrences/fail.png',
    ]);
  });

  /**
   * Garante que a criacao associa a ocorrencia ao utilizador autenticado e define o estado inicial.
   * @return void
   */
  it('should create an occurrence with authenticated user and initial submitted status', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([
      '/uploads/occurrences/one.png',
    ]);
    prisma.occurrence.create.mockResolvedValue({
      id: 1,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Candeeiro apagado',
      location: ' Rua A ',
      imageUrls: ['/uploads/occurrences/one.png'],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 12,
    });

    await service.create(
      12,
      {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: ' Rua A ',
        description: '  Candeeiro apagado  ',
      },
      [
        {
          buffer: Buffer.from('img'),
          mimetype: 'image/png',
          originalname: 'one.png',
          size: 3,
        },
      ],
    );

    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        otherCategoryDetail: null,
        description: 'Candeeiro apagado',
        location: ' Rua A ',
        imageUrls: ['/uploads/occurrences/one.png'],
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
