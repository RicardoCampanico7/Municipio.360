import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CertificationStatus, Role } from '@prisma/client';
import { rm } from 'fs/promises';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { occurrenceUploadConfig } from './../src/occurences/occurrence-upload';
import { PrismaService } from './../src/prisma/prisma.service';

const JWT_SECRET = 'municipio360-e2e-secret';
const SMALL_IMAGE_BUFFER = Buffer.from('small-image');
const SMALL_IMAGE_DATA_URL =
  'data:image/png;base64,' + SMALL_IMAGE_BUFFER.toString('base64');
const LARGE_IMAGE_BUFFER = Buffer.alloc(3 * 1024 * 1024 + 1, 1);

describe('Occurrences permissions (e2e)', () => {
  let app: INestApplication<App>;
  let httpApp: Parameters<typeof request>[0];
  let jwtService: JwtService;
  let prisma: {
    user: {
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
    prisma = {
      user: {
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
    await rm(occurrenceUploadConfig.uploadsRoot, {
      recursive: true,
      force: true,
    });
  });

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

  it('returns 201 when a certified CIVIL user creates an occurrence using JSON data URLs', async () => {
    const token = signToken({
      sub: 24,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 24,
      certStatus: CertificationStatus.CERTIFIED,
    });
    prisma.occurrence.create.mockImplementation(async ({ data }) => ({
      id: 24,
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

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua C',
        description: 'Candeeiro apagado',
        imageUrls: [SMALL_IMAGE_DATA_URL],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.imageUrls).toEqual([SMALL_IMAGE_DATA_URL]);
        expect(body.status).toBe('open');
      });
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

  it('returns 201 when a certified CIVIL user creates an occurrence using previously uploaded public image URLs', async () => {
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

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'ILUMINACAO_PUBLICA',
        location: 'Rua D',
        description: 'Candeeiro partido',
        imageUrls: ['/uploads/occurrences/existing.png'],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.imageUrls).toEqual(['/uploads/occurrences/existing.png']);
      });
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
});
