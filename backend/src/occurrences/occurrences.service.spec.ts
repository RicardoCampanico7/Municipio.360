import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CertificationStatus,
  OccurrenceCategory,
  OccurrenceStatus,
  Role,
} from '@prisma/client';
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
} from './upload/occurrence-upload';
import { OccurrencesService } from './occurrences.service';

jest.mock('./upload/occurrence-upload', () => ({
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
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
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

  /**
   * Confirma que a operacao testada registou a ultima entrada esperada no historico de estados.
   * @param occurrenceId Identificador da ocorrencia usada no teste.
   * @param status Estado esperado na ultima insercao.
   * @return void
   */
  function expectLatestStatusHistoryInsert(
    occurrenceId: number,
    status: OccurrenceStatus,
  ) {
    expect(prisma.$executeRaw).toHaveBeenCalled();

    const latestCall =
      prisma.$executeRaw.mock.calls[prisma.$executeRaw.mock.calls.length - 1];
    const [queryParts, recordedOccurrenceId, recordedStatus] = latestCall;

    expect(queryParts.join('')).toContain('"OccurrenceStatusHistory"');
    expect(recordedOccurrenceId).toBe(occurrenceId);
    expect(recordedStatus).toBe(status);
  }

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
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(),
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
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );

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
   * Garante que o detalhe do proprietario inclui historico cronologico de estados.
   * @return void
   */
  it('should include status history on owned occurrence detail', async () => {
    prisma.occurrence.findUnique
      .mockResolvedValueOnce({
        id: 42,
        userId: 7,
      })
      .mockResolvedValueOnce({
        id: 42,
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        otherCategoryDetail: null,
        description: 'Candeeiro apagado',
        location: 'Rua A',
        imageUrls: [],
        status: OccurrenceStatus.EM_TRATAMENTO,
        createdAt: new Date('2026-04-05T09:00:00.000Z'),
        updatedAt: new Date('2026-04-05T10:00:00.000Z'),
        userId: 7,
        statusHistory: [
          {
            id: 1,
            status: OccurrenceStatus.SUBMETIDA,
            createdAt: new Date('2026-04-05T09:00:00.000Z'),
          },
          {
            id: 2,
            status: OccurrenceStatus.EM_TRATAMENTO,
            createdAt: new Date('2026-04-05T09:30:00.000Z'),
          },
        ],
      });

    const result = await service.findMineById(42, 7);

    expect(prisma.occurrence.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 42 },
    });
    expect(prisma.occurrence.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 42 },
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
        statusHistory: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 42,
        title: 'Iluminacao publica',
        category: 'Iluminacao publica',
        categoryKey: OccurrenceCategory.ILUMINACAO_PUBLICA,
        status: 'progress',
        statusKey: OccurrenceStatus.EM_TRATAMENTO,
        statusHistory: [
          {
            id: 1,
            status: 'open',
            statusKey: OccurrenceStatus.SUBMETIDA,
            createdAt: new Date('2026-04-05T09:00:00.000Z'),
          },
          {
            id: 2,
            status: 'progress',
            statusKey: OccurrenceStatus.EM_TRATAMENTO,
            createdAt: new Date('2026-04-05T09:30:00.000Z'),
          },
        ],
      }),
    );
  });

  /**
   * Garante que o detalhe do proprietario e rejeitado quando a ocorrencia pertence a outro utilizador.
   * @return void
   */
  it('should reject owned occurrence detail when the occurrence belongs to another user', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 50,
      userId: 999,
    });

    await expect(service.findMineById(50, 7)).rejects.toThrow(
      'A ocorrencia nao pertence ao utilizador autenticado',
    );

    expect(prisma.occurrence.findUnique).toHaveBeenCalledTimes(1);
  });

  /**
   * Garante que o detalhe de gestao inclui comentarios internos e respetivo autor.
   * @return void
   */
  it('should include internal comments and their authors on operator detail', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 42,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Candeeiro apagado',
      location: 'Rua A',
      imageUrls: [],
      status: OccurrenceStatus.EM_TRATAMENTO,
      createdAt: new Date('2026-04-05T09:00:00.000Z'),
      updatedAt: new Date('2026-04-05T10:00:00.000Z'),
      userId: 7,
      user: {
        id: 7,
        name: 'Cidadao',
        email: 'cidadao@example.com',
        postalCode: '1000-001',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
      },
      internalComments: [
        {
          id: 3,
          content: 'Verificado no terreno.',
          occurrenceId: 42,
          userId: 99,
          createdAt: new Date('2026-04-05T09:30:00.000Z'),
          updatedAt: new Date('2026-04-05T09:30:00.000Z'),
          user: {
            id: 99,
            name: 'Operador',
            email: 'operador@example.com',
            role: Role.OPERADOR,
          },
        },
      ],
    });

    const result = await service.findOneForOperator(42);

    expect(prisma.occurrence.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
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
          select: {
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
          },
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 42,
        internalComments: [
          expect.objectContaining({
            id: 3,
            content: 'Verificado no terreno.',
            user: expect.objectContaining({
              id: 99,
              name: 'Operador',
              role: Role.OPERADOR,
            }),
          }),
        ],
      }),
    );
  });

  /**
   * Garante que o detalhe de gestao falha quando a ocorrencia nao existe.
   * @return void
   */
  it('should throw not found on operator detail when occurrence is missing', async () => {
    prisma.occurrence.findUnique.mockResolvedValue(null);

    await expect(service.findOneForOperator(999)).rejects.toThrow(
      'Ocorrencia nao encontrada',
    );
  });

  /**
   * Garante que a edicao de uma ocorrencia atualiza os campos permitidos e devolve o formato de operador.
   * @return void
   */
  it('should update an occurrence successfully', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 42,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Descricao antiga',
      location: 'Local antigo',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-04-05T09:00:00.000Z'),
      updatedAt: new Date('2026-04-05T09:00:00.000Z'),
      userId: 7,
      user: {
        id: 7,
        name: 'Cidadao',
        email: 'cidadao@example.com',
        postalCode: '1000-001',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
      },
      internalComments: [],
    });
    prisma.occurrence.update.mockResolvedValue({
      id: 42,
      category: OccurrenceCategory.OUTROS,
      otherCategoryDetail: 'Passadeira apagada',
      description: 'Sinal partido junto a escola',
      location: 'Avenida Central, Faro',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-04-05T09:00:00.000Z'),
      updatedAt: new Date('2026-04-06T09:00:00.000Z'),
      userId: 7,
      user: {
        id: 7,
        name: 'Cidadao',
        email: 'cidadao@example.com',
        postalCode: '1000-001',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
      },
      internalComments: [],
    });

    const result = await service.updateOccurrence(42, {
      category: OccurrenceCategory.OUTROS,
      otherCategoryDetail: '  Passadeira apagada  ',
      location: '  Avenida Central, Faro  ',
      description: '  Sinal partido junto a escola  ',
    });

    expect(prisma.occurrence.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        category: OccurrenceCategory.OUTROS,
        otherCategoryDetail: 'Passadeira apagada',
        location: 'Avenida Central, Faro',
        description: 'Sinal partido junto a escola',
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
          select: {
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
          },
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 42,
        category: OccurrenceCategory.OUTROS,
        otherCategoryDetail: 'Passadeira apagada',
        location: 'Avenida Central, Faro',
        description: 'Sinal partido junto a escola',
      }),
    );
  });

  /**
   * Garante que o detalhe alternativo e limpo quando a categoria deixa de ser OUTROS.
   * @return void
   */
  it('should clear otherCategoryDetail when the category is no longer OUTROS', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 42,
      category: OccurrenceCategory.OUTROS,
      otherCategoryDetail: 'Passadeira apagada',
      description: 'Descricao antiga',
      location: 'Local antigo',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-04-05T09:00:00.000Z'),
      updatedAt: new Date('2026-04-05T09:00:00.000Z'),
      userId: 7,
      user: {
        id: 7,
        name: 'Cidadao',
        email: 'cidadao@example.com',
        postalCode: '1000-001',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
      },
      internalComments: [],
    });
    prisma.occurrence.update.mockResolvedValue({
      id: 42,
      category: OccurrenceCategory.SINALIZACAO,
      otherCategoryDetail: null,
      description: '',
      location: 'Avenida Central, Faro',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-04-05T09:00:00.000Z'),
      updatedAt: new Date('2026-04-06T09:00:00.000Z'),
      userId: 7,
      user: {
        id: 7,
        name: 'Cidadao',
        email: 'cidadao@example.com',
        postalCode: '1000-001',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
      },
      internalComments: [],
    });

    await service.updateOccurrence(42, {
      category: OccurrenceCategory.SINALIZACAO,
      otherCategoryDetail: '  Deve ser limpo  ',
      location: '  Avenida Central, Faro  ',
    });

    expect(prisma.occurrence.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        category: OccurrenceCategory.SINALIZACAO,
        otherCategoryDetail: null,
        location: 'Avenida Central, Faro',
        description: '',
      },
      select: expect.any(Object),
    });
  });

  /**
   * Garante que a edicao falha quando a ocorrencia nao existe.
   * @return void
   */
  it('should fail to update when the occurrence does not exist', async () => {
    prisma.occurrence.findUnique.mockResolvedValue(null);

    await expect(
      service.updateOccurrence(999, {
        category: OccurrenceCategory.OUTROS,
        otherCategoryDetail: 'Passadeira apagada',
        location: 'Avenida Central, Faro',
        description: 'Sinal partido junto a escola',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.occurrence.update).not.toHaveBeenCalled();
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

    expect(saveOccurrenceImages).not.toHaveBeenCalled();
    expect(assignOccurrenceImagesToOccurrence).not.toHaveBeenCalled();
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
      uploadedImageUrls: ['/uploads/occurrences/existing.png'],
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
   * Garante compatibilidade com o alias legado imageUrls no body final.
   * @return void
   */
  it('should keep accepting the legacy imageUrls alias for previously uploaded URLs', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (saveOccurrenceImages as jest.Mock).mockResolvedValue([]);
    prisma.occurrence.create.mockResolvedValue({
      id: 177,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: '',
      location: 'Rua A',
      imageUrls: ['/uploads/occurrences/legacy.png'],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 7,
    });

    await service.create(7, {
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      location: 'Rua A',
      imageUrls: ['/uploads/occurrences/legacy.png'],
    });

    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrls: ['/uploads/occurrences/legacy.png'],
      }),
      select: expect.any(Object),
    });
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
        uploadedImageUrls: ['/uploads/occurrences/existing.png'],
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
      ['/uploads/occurrences/existing.png', '/uploads/occurrences/new.png'],
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
        uploadedImageUrls: ['data:image/png;base64,ZmFrZQ=='],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que URLs com formato publico invalido sao rejeitadas antes de consultar o disco.
   * @return void
   */
  it('should reject malformed uploaded image URLs', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });
    (isOccurrenceUploadPublicUrl as jest.Mock).mockReturnValue(false);

    await expect(
      service.create(7, {
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        location: 'Rua A',
        uploadedImageUrls: ['/uploads/occurrences/folder/image.png'],
      }),
    ).rejects.toThrow('A imagem 1 nao tem um formato valido');

    expect(occurrenceImageExistsByUrl).not.toHaveBeenCalled();
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
        uploadedImageUrls: ['/uploads/occurrences/missing.png'],
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
        uploadedImageUrls: ['/uploads/occurrences/other-user.png'],
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
        uploadedImageUrls: ['/uploads/occurrences/already-used.png'],
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
        uploadedImageUrls: [
          '/uploads/occurrences/dup.png',
          '/uploads/occurrences/dup.png',
        ],
      }),
    ).rejects.toThrow('Nao pode repetir a mesma fotografia na ocorrencia');

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  /**
   * Garante que ficheiros repetidos no mesmo pedido multipart sao rejeitados antes de serem guardados.
   * @return void
   */
  it('should reject duplicate uploaded image files in the same request', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
    });

    const duplicatedFile = {
      buffer: Buffer.from('same-image'),
      mimetype: 'image/png',
      originalname: 'same.png',
      size: 10,
    };

    await expect(
      service.create(
        7,
        {
          category: OccurrenceCategory.ILUMINACAO_PUBLICA,
          location: 'Rua A',
        },
        [duplicatedFile, { ...duplicatedFile, originalname: 'copy.png' }],
      ),
    ).rejects.toThrow('Nao pode repetir a mesma fotografia na ocorrencia');

    expect(saveOccurrenceImages).not.toHaveBeenCalled();
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
      }, [
        {
          buffer: Buffer.from('img'),
          mimetype: 'image/png',
          originalname: 'fail.png',
          size: 3,
        },
      ]),
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
      location: 'Rua A',
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
        location: 'Rua A',
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
    expectLatestStatusHistoryInsert(1, OccurrenceStatus.SUBMETIDA);
  });

  /**
   * Garante que uma mudanca valida de estado grava uma nova entrada de historico.
   * @return void
   */
  it('should persist a history entry when the occurrence status changes', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 1,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Candeeiro apagado',
      location: 'Rua A',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 10,
      user: {
        id: 10,
        name: 'Operador',
        email: 'operador@teste.pt',
        postalCode: '8000-000',
        role: 'OPERADOR',
        certStatus: 'CERTIFIED',
      },
    });
    prisma.occurrence.update.mockResolvedValue({
      id: 1,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Candeeiro apagado',
      location: 'Rua A',
      imageUrls: [],
      status: OccurrenceStatus.EM_TRATAMENTO,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-20T09:00:00.000Z'),
      userId: 10,
      user: {
        id: 10,
        name: 'Operador',
        email: 'operador@teste.pt',
        postalCode: '8000-000',
        role: 'OPERADOR',
        certStatus: 'CERTIFIED',
      },
    });

    const result = await service.updateStatus(
      1,
      OccurrenceStatus.EM_TRATAMENTO,
    );

    expect(prisma.occurrence.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: OccurrenceStatus.EM_TRATAMENTO },
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
          select: {
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
          },
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: OccurrenceStatus.EM_TRATAMENTO,
      }),
    );
    expectLatestStatusHistoryInsert(1, OccurrenceStatus.EM_TRATAMENTO);
  });

  /**
   * Garante que pedidos sem mudanca real de estado nao criam historico duplicado.
   * @return void
   */
  it('should skip updates when the occurrence status is unchanged', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 1,
      category: OccurrenceCategory.ILUMINACAO_PUBLICA,
      otherCategoryDetail: null,
      description: 'Candeeiro apagado',
      location: 'Rua A',
      imageUrls: [],
      status: OccurrenceStatus.SUBMETIDA,
      createdAt: new Date('2026-03-19T09:00:00.000Z'),
      updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      userId: 10,
      user: {
        id: 10,
        name: 'Operador',
        email: 'operador@teste.pt',
        postalCode: '8000-000',
        role: 'OPERADOR',
        certStatus: 'CERTIFIED',
      },
    });

    const result = await service.updateStatus(1, OccurrenceStatus.SUBMETIDA);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.occurrence.update).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: OccurrenceStatus.SUBMETIDA,
      }),
    );
  });

  /**
   * Garante que o fluxo de estados nao permite saltar diretamente de submetida para concluida.
   * @return void
   */
  it('should reject status transitions that skip the in-progress state', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 1,
      status: OccurrenceStatus.SUBMETIDA,
      user: { id: 10 },
    });

    await expect(
      service.updateStatus(1, OccurrenceStatus.CONCLUIDA),
    ).rejects.toThrow(
      'Transicao de estado invalida: SUBMETIDA -> CONCLUIDA',
    );

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.occurrence.update).not.toHaveBeenCalled();
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

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.occurrence.update).not.toHaveBeenCalled();
  });
});
