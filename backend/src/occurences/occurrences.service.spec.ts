import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  assignOccurrenceImagesToOccurrence,
  getOccurrenceImageMetadataByUrl,
  occurrenceImageExistsByUrl,
  isOccurrenceUploadPublicUrl,
  removeOccurrenceImagesByUrls,
  saveOccurrenceImages,
  unassignOccurrenceImagesFromOccurrence,
} from './occurrence-upload';
import { OccurrencesService } from './occurrences.service';

jest.mock('./occurrence-upload', () => ({
  occurrenceUploadConfig: {
    maxFiles: 3,
    maxFileSizeBytes: 3 * 1024 * 1024,
    uploadsRoot: '/tmp/occurrences',
    uploadsMetadataRoot: '/tmp/.occurrences-meta',
    publicBasePath: '/uploads/occurrences',
  },
  isOccurrenceUploadPublicUrl: jest.fn((imageUrl: string) =>
    imageUrl.startsWith('/uploads/occurrences/'),
  ),
  occurrenceImageExistsByUrl: jest.fn(async (imageUrl: string) =>
    imageUrl.startsWith('/uploads/occurrences/'),
  ),
  getOccurrenceImageMetadataByUrl: jest.fn(async (imageUrl: string) =>
    imageUrl.startsWith('/uploads/occurrences/')
      ? {
          ownerUserId: 7,
          createdAt: '2026-03-19T09:00:00.000Z',
          occurrenceId: null,
        }
      : null,
  ),
  saveOccurrenceImages: jest.fn(),
  removeOccurrenceImagesByUrls: jest.fn(),
  assignOccurrenceImagesToOccurrence: jest.fn(),
  unassignOccurrenceImagesFromOccurrence: jest.fn(),
}));

/**
 * Valida respostas publicas, criacao de ocorrencias e regras de associacao de imagens.
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
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (isOccurrenceUploadPublicUrl as jest.Mock).mockImplementation(
      (imageUrl: string) => imageUrl.startsWith('/uploads/occurrences/'),
    );
    (occurrenceImageExistsByUrl as jest.Mock).mockImplementation(
      async (imageUrl: string) => imageUrl.startsWith('/uploads/occurrences/'),
    );
    (getOccurrenceImageMetadataByUrl as jest.Mock).mockImplementation(
      async (imageUrl: string) =>
        imageUrl.startsWith('/uploads/occurrences/')
          ? {
              ownerUserId: 7,
              createdAt: '2026-03-19T09:00:00.000Z',
              occurrenceId: null,
            }
          : null,
    );
    (assignOccurrenceImagesToOccurrence as jest.Mock).mockResolvedValue(
      undefined,
    );
    (unassignOccurrenceImagesFromOccurrence as jest.Mock).mockResolvedValue(
      undefined,
    );

    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      occurrence: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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

    expect(saveOccurrenceImages).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          originalname: 'photo.png',
        }),
      ],
      7,
    );
    expect(assignOccurrenceImagesToOccurrence).toHaveBeenCalledWith(
      ['/uploads/occurrences/a.png'],
      2,
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

    expect(saveOccurrenceImages).toHaveBeenCalledWith([], 7);
    expect(assignOccurrenceImagesToOccurrence).toHaveBeenCalledWith([], 3);
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
   * Garante que a criacao aceita URLs publicas previamente carregadas.
   * @return void
   */
  it('should allow associating previously uploaded public image URLs', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([]);
    prisma.occurrence.create.mockResolvedValue({
      id: 77,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: '',
      location: 'Rua A',
      imageUrls: ['/uploads/occurrences/existing.png'],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 7,
    });

    const result = await service.create(7, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
      imageUrls: ['/uploads/occurrences/existing.png'],
    });

    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrls: ['/uploads/occurrences/existing.png'],
      }),
      select: expect.any(Object),
    });
    expect(assignOccurrenceImagesToOccurrence).toHaveBeenCalledWith(
      ['/uploads/occurrences/existing.png'],
      77,
    );
    expect(result).toEqual(
      expect.objectContaining({
        imageUrls: ['/uploads/occurrences/existing.png'],
        status: 'open',
      }),
    );
  });

  /**
   * Garante que a criacao pode combinar URLs previamente carregadas com novos ficheiros.
   * @return void
   */
  it('should combine previously uploaded image URLs with newly uploaded files', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([
      '/uploads/occurrences/new.png',
    ]);
    prisma.occurrence.create.mockResolvedValue({
      id: 78,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: '',
      location: 'Rua A',
      imageUrls: [
        '/uploads/occurrences/existing.png',
        '/uploads/occurrences/new.png',
      ],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 7,
    });

    await service.create(
      7,
      {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: ['/uploads/occurrences/existing.png'],
      },
      [
        {
          buffer: Buffer.from('img'),
          mimetype: 'image/png',
          originalname: 'new.png',
          size: 3,
        },
      ],
    );

    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrls: [
          '/uploads/occurrences/existing.png',
          '/uploads/occurrences/new.png',
        ],
      }),
      select: expect.any(Object),
    });
    expect(assignOccurrenceImagesToOccurrence).toHaveBeenCalledWith(
      [
        '/uploads/occurrences/existing.png',
        '/uploads/occurrences/new.png',
      ],
      78,
    );
  });

  /**
   * Garante que a criacao rejeita data URLs no body final.
   * @return void
   */
  it('should reject inline image data URLs sent in the request body', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });

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
   * Garante que a criacao rejeita URLs publicas inexistentes na validacao final.
   * @return void
   */
  it('should reject missing previously uploaded image URLs', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (getOccurrenceImageMetadataByUrl as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: ['/uploads/occurrences/missing.png'],
      }),
    ).rejects.toThrow('nao existe ou ja nao esta disponivel');

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que a criacao rejeita fotografias carregadas por outro utilizador.
   * @return void
   */
  it('should reject image URLs uploaded by another user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (getOccurrenceImageMetadataByUrl as jest.Mock).mockResolvedValue({
      ownerUserId: 99,
      createdAt: '2026-03-19T09:00:00.000Z',
      occurrenceId: null,
    });

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: ['/uploads/occurrences/other-user.png'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que a criacao rejeita fotografias ja associadas a outra ocorrencia.
   * @return void
   */
  it('should reject image URLs that are already associated to an occurrence', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (getOccurrenceImageMetadataByUrl as jest.Mock).mockResolvedValue({
      ownerUserId: 7,
      createdAt: '2026-03-19T09:00:00.000Z',
      occurrenceId: 12,
    });

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: ['/uploads/occurrences/already-used.png'],
      }),
    ).rejects.toThrow('ja esta associada a uma ocorrencia');

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que a criacao rejeita repeticao da mesma URL no pedido final.
   * @return void
   */
  it('should reject duplicate image URLs in the final request body', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        imageUrls: [
          '/uploads/occurrences/dup.png',
          '/uploads/occurrences/dup.png',
        ],
      }),
    ).rejects.toThrow('Nao pode repetir a mesma fotografia na ocorrencia');

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

    expect(saveOccurrenceImages).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          originalname: 'uploaded.png',
        }),
      ],
      7,
    );
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
   * Garante rollback quando a associacao final da imagem falha apos criar a ocorrencia.
   * @return void
   */
  it('should rollback the occurrence when final image association fails', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([
      '/uploads/occurrences/fail.png',
    ]);
    prisma.occurrence.create.mockResolvedValue({
      id: 91,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: '',
      location: 'Rua A',
      imageUrls: ['/uploads/occurrences/fail.png'],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 7,
    });
    prisma.occurrence.delete.mockResolvedValue({
      id: 91,
    });
    (assignOccurrenceImagesToOccurrence as jest.Mock).mockRejectedValue(
      new Error('metadata failure'),
    );

    await expect(
      service.create(
        7,
        {
          category: OccurrenceCategory.ILUMINACAO_PUBLICA,
          location: 'Rua A',
        },
        [
          {
            buffer: Buffer.from('img'),
            mimetype: 'image/png',
            originalname: 'fail.png',
            size: 3,
          },
        ],
      ),
    ).rejects.toThrow('metadata failure');

    expect(unassignOccurrenceImagesFromOccurrence).toHaveBeenCalledWith(
      ['/uploads/occurrences/fail.png'],
      91,
    );
    expect(prisma.occurrence.delete).toHaveBeenCalledWith({
      where: { id: 91 },
    });
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
    (getOccurrenceImageMetadataByUrl as jest.Mock).mockResolvedValue({
      ownerUserId: 12,
      createdAt: '2026-03-19T09:00:00.000Z',
      occurrenceId: null,
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
