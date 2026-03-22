import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { CertificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

/**
 * Valida as respostas seguras do servico de autenticacao.
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwt: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwt = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwt,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Garante que o registo devolve apenas dados visiveis do utilizador.
   * @return void
   */
  it('should return only visible user fields on register', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 7,
      name: 'Maria Silva',
      biNumber: '12345678 1 AB2',
      postalCode: '8000-000',
      email: 'maria@teste.pt',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T10:00:00.000Z'),
      updatedAt: new Date('2026-03-17T10:00:00.000Z'),
    });
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

    const result = await service.register({
      name: ' Maria Silva ',
      biNumber: '12345678 1 ab2',
      postalCode: '8000-000',
      email: 'MARIA@TESTE.PT',
      password: 'Password123!',
      role: Role.ADMINISTRADOR,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Maria Silva',
          biNumber: '12345678 1 AB2',
          email: 'maria@teste.pt',
          passwordHash: 'hashed-password',
          role: Role.ADMINISTRADOR,
          certStatus: CertificationStatus.CERTIFIED,
        }),
      }),
    );
    expect(result.user).toEqual({
      id: 7,
      name: 'Maria Silva',
      biNumber: '12345678 1 AB2',
      postalCode: '8000-000',
      email: 'maria@teste.pt',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T10:00:00.000Z'),
      updatedAt: new Date('2026-03-17T10:00:00.000Z'),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  /**
   * Garante que o login nao expoe o hash da password na resposta.
   * @return void
   */
  it('should omit sensitive fields from the login response', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 9,
      name: 'Operador',
      email: 'operador@teste.pt',
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
      biNumber: '22345678 1 AB2',
      postalCode: '8000-010',
      passwordHash: 'stored-hash',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwt.signAsync.mockResolvedValue('signed-jwt');

    const result = await service.login({
      email: 'OPERADOR@TESTE.PT',
      password: 'Password123!',
    });

    expect(result).toEqual({
      accessToken: 'signed-jwt',
      tokenType: 'Bearer',
      user: {
        id: 9,
        name: 'Operador',
        biNumber: '22345678 1 AB2',
        postalCode: '8000-010',
        email: 'operador@teste.pt',
        role: Role.OPERADOR,
        certStatus: CertificationStatus.CERTIFIED,
        createdAt: undefined,
        updatedAt: undefined,
      },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  /**
   * Garante que o endpoint de perfil devolve apenas campos seguros.
   * @return void
   */
  it('should return only visible fields on me', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 11,
      name: 'Admin',
      biNumber: '32345678 1 AB3',
      postalCode: '8000-020',
      email: 'admin@teste.pt',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T11:00:00.000Z'),
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });

    const result = await service.me(11);

    expect(result.user).toEqual({
      id: 11,
      name: 'Admin',
      biNumber: '32345678 1 AB3',
      postalCode: '8000-020',
      email: 'admin@teste.pt',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T11:00:00.000Z'),
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
