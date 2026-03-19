import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CertificationStatus, Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

const JWT_SECRET = 'municipio360-e2e-secret';
const SMALL_IMAGE_DATA_URL =
  'data:image/png;base64,' + Buffer.from('small-image').toString('base64');

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
      .send({
        category: 'Iluminação pública',
        location: 'Rua A',
        imageUrls: [SMALL_IMAGE_DATA_URL],
      })
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
      .send({
        category: 'Iluminação pública',
        location: 'Rua A',
        imageUrls: [SMALL_IMAGE_DATA_URL],
      })
      .expect(403);
  });

  it('returns 403 when a CIVIL user is authenticated but not certified', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 11,
      certStatus: CertificationStatus.PENDING,
    });

    const token = signToken({
      sub: 11,
      role: Role.CIVIL,
      certStatus: CertificationStatus.PENDING,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'Iluminação pública',
        location: 'Rua A',
        imageUrls: [SMALL_IMAGE_DATA_URL],
      })
      .expect(403);
  });

  it('returns 400 when a certified CIVIL user omits required images', async () => {
    const token = signToken({
      sub: 12,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    });

    await request(httpApp)
      .post('/occurrences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'Buracos no pavimento',
        location: 'Rua B',
      })
      .expect(400);
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

    await request(httpApp).get('/occurrences').expect(200).expect(occurrences);
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

    await request(httpApp).get('/occurrences/22').expect(200).expect(occurrence);
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
