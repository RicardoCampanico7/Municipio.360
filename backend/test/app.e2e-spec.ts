import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CertificationStatus,
  OccurrenceCategory,
  OccurrenceStatus,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { occurrenceUploadConfig } from './../src/occurrences/upload/occurrence-upload';
import { PrismaService } from './../src/prisma/prisma.service';

const JWT_SECRET = 'municipio360-e2e-secret';
const SMALL_IMAGE_BUFFER = Buffer.from('small-image');
const SMALL_IMAGE_DATA_URL =
  'data:image/png;base64,' + SMALL_IMAGE_BUFFER.toString('base64');
const LARGE_IMAGE_BUFFER = Buffer.alloc(3 * 1024 * 1024 + 1, 1);

/**
 * Valida autenticacao, upload e associacao final de imagens no modulo de ocorrencias.
 */
describe('Occurrences permissions (e2e)', () => {
  let app: INestApplication<App>;
  let httpApp: Parameters<typeof request>[0];
  let jwtService: JwtService;
  let testUploadsRoot: string;
  let testUploadsMetadataRoot: string;
  let prisma: {
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    occurrence: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(async () => {
    testUploadsRoot = await mkdtemp(join(tmpdir(), 'municipio360-occ-'));
    testUploadsMetadataRoot = await mkdtemp(
      join(tmpdir(), 'municipio360-occ-meta-'),
    );

    const uploadConfig = occurrenceUploadConfig as {
      uploadsRoot: string;
      uploadsMetadataRoot: string;
    };
    uploadConfig.uploadsRoot = testUploadsRoot;
    uploadConfig.uploadsMetadataRoot = testUploadsMetadataRoot;

    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(),
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    httpApp = app.getHttpAdapter().getInstance();
    jwtService = new JwtService({ secret: JWT_SECRET });
  });

  afterEach(async () => {
    await app.close();
    await rm(testUploadsRoot, {
      recursive: true,
      force: true,
    });
    await rm(testUploadsMetadataRoot, {
      recursive: true,
      force: true,
    });
  });

  /**
   * Gera um JWT valido para simular perfis autenticados nos testes e2e.
   * @param param0 Dados minimos do utilizador autenticado.
   * @return string Token assinado pronto para enviar no header Authorization.
   */
  function signToken({
    sub,
    role,
    certStatus,
  }: {
    sub: number;
    role: Role;
    certStatus: CertificationStatus;
  }) {
    return jwtService.sign({
      sub,
      email: `user${sub}@example.com`,
      name: `User ${sub}`,
      role,
      certStatus,
    });
  }

  it('returns the root and health endpoints without authentication', async () => {
    await request(httpApp).get('/').expect(200).expect('Hello World!');

    await request(httpApp).get('/health').expect(200).expect({ ok: true });

    await request(httpApp)
      .get('/occurrences/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('returns public menu data for both the main route and alias', async () => {
    await request(httpApp)
      .get('/menu?lang=en')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            appName: expect.any(String),
            locale: 'en',
            items: expect.any(Array),
            languages: expect.any(Array),
          }),
        );
        expect(body.items.length).toBeGreaterThan(0);
      });

    await request(httpApp)
      .get('/menu/public?lang=fr')
      .expect(200)
      .expect(({ body }) => {
        expect(body.locale).toBe('fr');
        expect(body.items.length).toBeGreaterThan(0);
      });
  });

  it('registers a new user through the auth module', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 41,
      name: 'Maria Fernandes',
      biNumber: '12345678',
      postalCode: '1000-123',
      email: 'maria@municipio360.pt',
      avatarUrl: null,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-04-10T09:00:00.000Z'),
      updatedAt: new Date('2026-04-10T09:00:00.000Z'),
    });

    await request(httpApp)
      .post('/auth/register')
      .send({
        name: 'Maria Fernandes',
        biNumber: '12345678',
        postalCode: '1000-123',
        email: 'maria@municipio360.pt',
        password: 'SenhaSegura123',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            message: 'Utilizador registado com sucesso',
            user: expect.objectContaining({
              id: 41,
              email: 'maria@municipio360.pt',
              role: Role.CIVIL,
            }),
          }),
        );
      });
  });

  it('logs in and returns the authenticated profile', async () => {
    const email = 'operador@municipio360.pt';
    const password = 'SenhaSegura123';
    const passwordHash = await bcrypt.hash(password, 10);

    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if ('email' in where) {
        return {
          id: 42,
          name: 'Operador Municipal',
          biNumber: '87654321',
          postalCode: '1000-124',
          email,
          avatarUrl: null,
          role: Role.OPERADOR,
          certStatus: CertificationStatus.CERTIFIED,
          passwordHash,
        };
      }

      if ('id' in where) {
        return {
          id: 42,
          name: 'Operador Municipal',
          biNumber: '87654321',
          postalCode: '1000-124',
          email,
          avatarUrl: null,
          role: Role.OPERADOR,
          certStatus: CertificationStatus.CERTIFIED,
          createdAt: new Date('2026-04-10T09:30:00.000Z'),
          updatedAt: new Date('2026-04-10T09:30:00.000Z'),
        };
      }

      return null;
    });

    const loginResponse = await request(httpApp)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginResponse.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        user: expect.objectContaining({
          id: 42,
          email,
          role: Role.OPERADOR,
        }),
      }),
    );

    await request(httpApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: 42,
              email,
              role: Role.OPERADOR,
            }),
          }),
        );
      });
  });

  it('returns the users list for an authenticated operator', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 51,
        name: 'Cidadao Teste',
        biNumber: '11223344',
        postalCode: '1000-125',
        email: 'cidadao@municipio360.pt',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
        createdAt: new Date('2026-04-10T10:00:00.000Z'),
        updatedAt: new Date('2026-04-10T10:00:00.000Z'),
      },
    ]);

    const token = signToken({
      sub: 52,
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            id: 51,
            email: 'cidadao@municipio360.pt',
            role: Role.CIVIL,
          }),
        ]);
      });
  });

  it('returns 401 when creating an occurrence without authentication', async () => {
    await request(httpApp)
      .post('/occurrences')
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A')
      .expect(401);
  });

  it('returns 403 when a non-CIVIL user tries to create an occurrence', async () => {
    const token = signToken({
      sub: 10,
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A')
      .expect(403);
  });

  it('returns 201 when a CIVIL user with pending certification creates an occurrence', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 11,
      certStatus: CertificationStatus.PENDING,
    });
    prisma.occurrence.create.mockImplementation(async ({ data }) => ({
      id: 11,
      category: data.category,
      otherCategoryDetail: data.otherCategoryDetail,
      description: data.description,
      location: data.location,
      imageUrls: data.imageUrls,
      status: data.status,
      createdAt: new Date('2026-03-19T20:00:00.000Z'),
      updatedAt: new Date('2026-03-19T20:00:00.000Z'),
      userId: data.userId,
    }));

    const token = signToken({
      sub: 11,
      role: Role.CIVIL,
      certStatus: CertificationStatus.PENDING,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A')
      .expect(201);
  });

  it('returns 201 when a certified CIVIL user creates an occurrence without images', async () => {
    const token = signToken({
      sub: 12,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      certStatus: CertificationStatus.CERTIFIED,
    });
    prisma.occurrence.create.mockImplementation(async ({ data }) => ({
      id: 12,
      category: data.category,
      otherCategoryDetail: data.otherCategoryDetail,
      description: data.description,
      location: data.location,
      imageUrls: data.imageUrls,
      status: data.status,
      createdAt: new Date('2026-03-19T20:00:00.000Z'),
      updatedAt: new Date('2026-03-19T20:00:00.000Z'),
      userId: data.userId,
    }));

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'BURACOS_PAVIMENTO')
      .field('location', 'Rua B')
      .expect(201);
  });

  it('returns 201 and persists public image URLs when a certified CIVIL user uploads images', async () => {
    const token = signToken({
      sub: 20,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 20,
      certStatus: CertificationStatus.CERTIFIED,
    });
    prisma.occurrence.create.mockImplementation(async ({ data }) => ({
      id: 70,
      category: data.category,
      otherCategoryDetail: data.otherCategoryDetail,
      description: data.description,
      location: data.location,
      imageUrls: data.imageUrls,
      status: data.status,
      createdAt: new Date('2026-03-19T20:00:00.000Z'),
      updatedAt: new Date('2026-03-19T20:00:00.000Z'),
      userId: data.userId,
    }));

    const response = await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A')
      .field('description', 'Candeeiro apagado')
      .attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: 'photo-1.png',
        contentType: 'image/png',
      })
      .attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: 'photo-2.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(response.body.imageUrls).toHaveLength(2);
    expect(response.body.imageUrls[0]).toMatch(
      /^\/uploads\/occurrences\/.+\.png$/,
    );
    expect(prisma.occurrence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrls: response.body.imageUrls,
      }),
      select: expect.any(Object),
    });
  });

  it('returns 400 when a certified CIVIL user sends image references in JSON instead of files', async () => {
    const token = signToken({
      sub: 24,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 24,
      certStatus: CertificationStatus.CERTIFIED,
    });
    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua C',
        description: 'Candeeiro apagado',
        imageUrls: [SMALL_IMAGE_DATA_URL],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain(
          'As fotografias devem ser enviadas como ficheiros',
        );
      });

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  it('returns 201 and public image URLs when a certified CIVIL user uploads images to the dedicated endpoint', async () => {
    const token = signToken({
      sub: 25,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 25,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: 'standalone.png',
        contentType: 'image/png',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.imageUrls).toHaveLength(1);
        expect(body.imageUrls[0]).toMatch(/^\/uploads\/occurrences\/.+\.png$/);
      });
  });

  it('returns 400 when the dedicated image upload endpoint receives no files', async () => {
    const token = signToken({
      sub: 26,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 26,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences/images')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('pelo menos uma fotografia');
      });
  });

  it('returns 201 when a certified CIVIL user associates a previously uploaded image URL to an occurrence', async () => {
    const token = signToken({
      sub: 27,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 27,
      certStatus: CertificationStatus.CERTIFIED,
    });
    prisma.occurrence.create.mockImplementation(async ({ data }) => ({
      id: 27,
      title: 'Iluminacao publica',
      category: 'Iluminacao publica',
      categoryKey: 'ILUMINACAO_PUBLICA',
      otherCategoryDetail: data.otherCategoryDetail,
      description: data.description,
      location: data.location,
      imageUrls: data.imageUrls,
      status: 'open',
      statusKey: 'SUBMETIDA',
      createdAt: new Date('2026-03-19T20:00:00.000Z'),
      updatedAt: new Date('2026-03-19T20:00:00.000Z'),
      userId: data.userId,
    }));

    const uploadResponse = await request(httpApp)
      .post('/occurrences/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: 'existing.png',
        contentType: 'image/png',
      })
      .expect(201);

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua D',
        description: 'Candeeiro partido',
        uploadedImageUrls: uploadResponse.body.imageUrls,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.imageUrls).toEqual(uploadResponse.body.imageUrls);
      });
  });

  it('returns 403 when a CIVIL user tries to associate an image uploaded by another user', async () => {
    const ownerToken = signToken({
      sub: 29,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });
    const attackerToken = signToken({
      sub: 30,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockImplementation(async ({ where }) => ({
      id: where.id,
      certStatus: CertificationStatus.CERTIFIED,
    }));

    const uploadResponse = await request(httpApp)
      .post('/occurrences/images')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: 'private.png',
        contentType: 'image/png',
      })
      .expect(201);

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua F',
        description: 'Tentativa invalida',
        uploadedImageUrls: uploadResponse.body.imageUrls,
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toContain(
          'nao pertence ao utilizador autenticado',
        );
      });

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  it('returns 400 when a certified CIVIL user tries to reuse an image URL already linked to another occurrence', async () => {
    const token = signToken({
      sub: 31,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 31,
      certStatus: CertificationStatus.CERTIFIED,
    });
    prisma.occurrence.create.mockImplementation(async ({ data }) => ({
      id: Math.floor(Math.random() * 1000) + 1,
      title: 'Iluminacao publica',
      category: 'Iluminacao publica',
      categoryKey: 'ILUMINACAO_PUBLICA',
      otherCategoryDetail: data.otherCategoryDetail,
      description: data.description,
      location: data.location,
      imageUrls: data.imageUrls,
      status: 'open',
      statusKey: 'SUBMETIDA',
      createdAt: new Date('2026-03-19T20:00:00.000Z'),
      updatedAt: new Date('2026-03-19T20:00:00.000Z'),
      userId: data.userId,
    }));

    const uploadResponse = await request(httpApp)
      .post('/occurrences/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: 'single-use.png',
        contentType: 'image/png',
      })
      .expect(201);

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua G',
        description: 'Primeira associacao',
        uploadedImageUrls: uploadResponse.body.imageUrls,
      })
      .expect(201);

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua H',
        description: 'Segunda associacao',
        uploadedImageUrls: uploadResponse.body.imageUrls,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('ja esta associada a uma ocorrencia');
      });
  });

  it('returns 400 when a certified CIVIL user tries to create an occurrence with a missing uploaded image URL', async () => {
    const token = signToken({
      sub: 28,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 28,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua E',
        description: 'Candeeiro sem suporte',
        uploadedImageUrls: ['/uploads/occurrences/missing.png'],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('nao existe ou ja nao esta disponivel');
      });

    expect(prisma.occurrence.create).not.toHaveBeenCalled();
  });

  it('returns 400 when a non-image file is uploaded', async () => {
    const token = signToken({
      sub: 21,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A')
      .attach('imageUrls', Buffer.from('not-an-image'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('PNG, JPEG, WEBP ou GIF');
      });
  });

  it('returns 400 when an uploaded image exceeds the configured size limit', async () => {
    const token = signToken({
      sub: 22,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A')
      .attach('imageUrls', LARGE_IMAGE_BUFFER, {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('3 MB');
      });
  });

  it('returns 400 when more than the configured number of images is uploaded', async () => {
    const token = signToken({
      sub: 23,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    let requestBuilder = request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'ILUMINACAO_PUBLICA')
      .field('location', 'Rua A');

    for (let index = 0; index < 4; index += 1) {
      requestBuilder = requestBuilder.attach('imageUrls', SMALL_IMAGE_BUFFER, {
        filename: `photo-${index}.png`,
        contentType: 'image/png',
      });
    }

    await requestBuilder.expect(400).expect(({ body }) => {
      expect(body.message).toContain('maximo 3 fotografias');
    });
  });

  it('returns own occurrence detail with status history for a CIVIL user', async () => {
    prisma.occurrence.findUnique
      .mockResolvedValueOnce({
        id: 51,
        userId: 32,
      })
      .mockResolvedValueOnce({
        id: 51,
        category: OccurrenceCategory.ILUMINACAO_PUBLICA,
        otherCategoryDetail: null,
        description: 'Candeeiro apagado',
        location: 'Rua Central',
        imageUrls: [],
        status: OccurrenceStatus.EM_TRATAMENTO,
        createdAt: new Date('2026-04-05T09:00:00.000Z'),
        updatedAt: new Date('2026-04-05T11:30:00.000Z'),
        userId: 32,
        statusHistory: [
          {
            id: 1,
            status: OccurrenceStatus.SUBMETIDA,
            createdAt: new Date('2026-04-05T09:00:00.000Z'),
          },
          {
            id: 2,
            status: OccurrenceStatus.EM_TRATAMENTO,
            createdAt: new Date('2026-04-05T10:15:00.000Z'),
          },
        ],
      });

    const token = signToken({
      sub: 32,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .get('/occurrences/mine/51')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        id: 51,
        title: 'Iluminacao publica',
        category: 'Iluminacao publica',
        categoryKey: 'ILUMINACAO_PUBLICA',
        otherCategoryDetail: null,
        description: 'Candeeiro apagado',
        location: 'Rua Central',
        imageUrls: [],
        status: 'progress',
        statusKey: 'EM_TRATAMENTO',
        createdAt: '2026-04-05T09:00:00.000Z',
        updatedAt: '2026-04-05T11:30:00.000Z',
        userId: 32,
        statusHistory: [
          {
            id: 1,
            status: 'open',
            statusKey: 'SUBMETIDA',
            createdAt: '2026-04-05T09:00:00.000Z',
          },
          {
            id: 2,
            status: 'progress',
            statusKey: 'EM_TRATAMENTO',
            createdAt: '2026-04-05T10:15:00.000Z',
          },
        ],
      });
  });

  it('returns 403 when a CIVIL user tries to access another user occurrence detail', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 50,
      userId: 999,
    });

    const token = signToken({
      sub: 13,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .get('/occurrences/mine/50')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('returns the public occurrences list without authentication', async () => {
    const occurrences = [
      {
        id: 21,
        category: 'ILUMINACAO_PUBLICA',
        otherCategoryDetail: null,
        description: 'Candeeiro desligado',
        location: 'Rua da Liberdade',
        imageUrls: [],
        status: 'SUBMETIDA',
        createdAt: '2026-03-19T08:00:00.000Z',
        updatedAt: '2026-03-19T08:00:00.000Z',
      },
    ];

    prisma.occurrence.findMany.mockResolvedValue(occurrences);

    await request(httpApp)
      .get('/occurrences')
      .expect(200)
      .expect([
        {
          id: 21,
          title: 'Iluminacao publica',
          category: 'Iluminacao publica',
          categoryKey: 'ILUMINACAO_PUBLICA',
          otherCategoryDetail: null,
          description: 'Candeeiro desligado',
          location: 'Rua da Liberdade',
          imageUrls: [],
          status: 'open',
          statusKey: 'SUBMETIDA',
          createdAt: '2026-03-19T08:00:00.000Z',
          updatedAt: '2026-03-19T08:00:00.000Z',
        },
      ]);
  });

  it('returns the public occurrence detail without authentication', async () => {
    const occurrence = {
      id: 22,
      category: 'SINALIZACAO',
      otherCategoryDetail: null,
      description: 'Sinal tombado',
      location: 'Avenida do Municipio',
      imageUrls: [SMALL_IMAGE_DATA_URL],
      status: 'EM_TRATAMENTO',
      createdAt: '2026-03-19T09:00:00.000Z',
      updatedAt: '2026-03-19T11:30:00.000Z',
    };

    prisma.occurrence.findUnique.mockResolvedValue(occurrence);

    await request(httpApp)
      .get('/occurrences/22')
      .expect(200)
      .expect({
        id: 22,
        title: 'Sinalizacao',
        category: 'Sinalizacao',
        categoryKey: 'SINALIZACAO',
        otherCategoryDetail: null,
        description: 'Sinal tombado',
        location: 'Avenida do Municipio',
        imageUrls: [SMALL_IMAGE_DATA_URL],
        status: 'progress',
        statusKey: 'EM_TRATAMENTO',
        createdAt: '2026-03-19T09:00:00.000Z',
        updatedAt: '2026-03-19T11:30:00.000Z',
      });
  });

  it('returns 403 when a CIVIL user tries to access management routes', async () => {
    const token = signToken({
      sub: 14,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .get('/occurrences/management')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(httpApp)
      .get('/occurrences/management/22')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('returns 200 when an OPERADOR accesses the management list', async () => {
    prisma.occurrence.findMany.mockResolvedValue([]);

    const token = signToken({
      sub: 15,
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .get('/occurrences/management')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([]);
  });

  it('returns 200 with internal comments and authors when an OPERADOR accesses the management detail', async () => {
    prisma.occurrence.findUnique.mockResolvedValue({
      id: 22,
      category: OccurrenceCategory.SINALIZACAO,
      otherCategoryDetail: null,
      description: 'Sinal tombado',
      location: 'Avenida do Municipio',
      imageUrls: [],
      status: OccurrenceStatus.EM_TRATAMENTO,
      createdAt: new Date('2026-04-05T09:00:00.000Z'),
      updatedAt: new Date('2026-04-05T11:30:00.000Z'),
      userId: 8,
      user: {
        id: 8,
        name: 'Cidadao',
        email: 'cidadao@example.com',
        postalCode: '1000-001',
        role: Role.CIVIL,
        certStatus: CertificationStatus.CERTIFIED,
      },
      internalComments: [
        {
          id: 5,
          content: 'Equipa notificada.',
          occurrenceId: 22,
          userId: 15,
          createdAt: new Date('2026-04-05T10:00:00.000Z'),
          updatedAt: new Date('2026-04-05T10:05:00.000Z'),
          user: {
            id: 15,
            name: 'Operador Municipal',
            email: 'operador@example.com',
            role: Role.OPERADOR,
          },
        },
      ],
    });

    const token = signToken({
      sub: 15,
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .get('/occurrences/management/22')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            id: 22,
            user: expect.objectContaining({
              id: 8,
              name: 'Cidadao',
              role: Role.CIVIL,
            }),
            internalComments: [
              expect.objectContaining({
                id: 5,
                content: 'Equipa notificada.',
                user: expect.objectContaining({
                  id: 15,
                  name: 'Operador Municipal',
                  role: Role.OPERADOR,
                }),
              }),
            ],
          }),
        );
      });
  });
});
