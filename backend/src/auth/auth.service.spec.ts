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
      update: jest.Mock;
    };
  };
  let jwt: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwt = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
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
      avatarUrl: 'data:image/png;base64,QUJDRA==',
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
      avatarUrl: ' data:image/png;base64,QUJDRA== ',
      password: 'Password123!',
      role: Role.ADMINISTRADOR,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Maria Silva',
          biNumber: '12345678 1 AB2',
          email: 'maria@teste.pt',
          avatarUrl: 'data:image/png;base64,QUJDRA==',
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
      avatarUrl: 'data:image/png;base64,QUJDRA==',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T10:00:00.000Z'),
      updatedAt: new Date('2026-03-17T10:00:00.000Z'),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  /**
   * Garante que a fotografia de perfil pode ser omitida no registo.
   * @return void
   */
  it('should register a user without an avatar', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 8,
      name: 'Ana Costa',
      biNumber: '22345678',
      postalCode: '1000-123',
      email: 'ana@teste.pt',
      avatarUrl: null,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T10:00:00.000Z'),
      updatedAt: new Date('2026-03-17T10:00:00.000Z'),
    });
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

    const result = await service.register({
      name: 'Ana Costa',
      biNumber: '22345678',
      postalCode: '1000-123',
      email: 'ANA@TESTE.PT',
      password: 'Password123!',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          avatarUrl: null,
        }),
      }),
    );
    expect(result.user.avatarUrl).toBeUndefined();
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
      avatarUrl: 'data:image/jpeg;base64,QUJDRA==',
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
      isActive: true,
      authVersion: 0,
      biNumber: '22345678 1 AB2',
      postalCode: '8000-010',
      passwordHash: 'stored-hash',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwt.signAsync
      .mockResolvedValueOnce('signed-access-jwt')
      .mockResolvedValueOnce('signed-refresh-jwt');
    jest
      .mocked(bcrypt.hash)
      .mockResolvedValue('hashed-refresh-token' as never);

    const result = await service.login({
      email: 'OPERADOR@TESTE.PT',
      password: 'Password123!',
    });

    expect(result).toEqual({
      accessToken: 'signed-access-jwt',
      refreshToken: 'signed-refresh-jwt',
      tokenType: 'Bearer',
      user: {
        id: 9,
        name: 'Operador',
        biNumber: '22345678 1 AB2',
        postalCode: '8000-010',
        email: 'operador@teste.pt',
        avatarUrl: 'data:image/jpeg;base64,QUJDRA==',
        role: Role.OPERADOR,
        certStatus: CertificationStatus.CERTIFIED,
        createdAt: undefined,
        updatedAt: undefined,
      },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(jwt.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sub: 9,
        role: Role.OPERADOR,
        certStatus: CertificationStatus.CERTIFIED,
        authVersion: 0,
      }),
    );
    expect(jwt.signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 9,
        authVersion: 0,
        tokenType: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { refreshTokenHash: 'hashed-refresh-token' },
      select: { id: true },
    });
  });

  /**
   * Garante que contas inativas nao conseguem iniciar sessao.
   * @return Promise<void>
   */
  it('should reject login for inactive accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      name: 'Inativo',
      email: 'inativo@teste.pt',
      avatarUrl: null,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
      isActive: false,
      authVersion: 0,
      biNumber: '42345678 1 AB3',
      postalCode: '8000-030',
      passwordHash: 'stored-hash',
    });

    await expect(
      service.login({
        email: 'inativo@teste.pt',
        password: 'Password123!',
      }),
    ).rejects.toThrow('Conta inativa');

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  /**
   * Garante que o refresh valida a hash guardada e roda os tokens.
   * @return Promise<void>
   */
  it('should rotate refresh tokens', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 9,
      authVersion: 0,
      tokenType: 'refresh',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 9,
      name: 'Operador',
      email: 'operador@teste.pt',
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
      isActive: true,
      authVersion: 0,
      refreshTokenHash: 'stored-refresh-hash',
    });
    jest
      .mocked(bcrypt.compare)
      .mockResolvedValue(true as never);
    jwt.signAsync
      .mockResolvedValueOnce('new-access-jwt')
      .mockResolvedValueOnce('new-refresh-jwt');
    jest
      .mocked(bcrypt.hash)
      .mockResolvedValue('new-refresh-hash' as never);

    await expect(
      service.refresh({ refreshToken: 'old-refresh-token' }),
    ).resolves.toEqual({
      accessToken: 'new-access-jwt',
      refreshToken: 'new-refresh-jwt',
      tokenType: 'Bearer',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'old-refresh-token',
      'stored-refresh-hash',
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { refreshTokenHash: 'new-refresh-hash' },
      select: { id: true },
    });
  });

  /**
   * Garante que refresh tokens reutilizados ou desconhecidos sao rejeitados.
   * @return Promise<void>
   */
  it('should reject refresh when the stored hash does not match', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 9,
      authVersion: 0,
      tokenType: 'refresh',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 9,
      name: 'Operador',
      email: 'operador@teste.pt',
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
      isActive: true,
      authVersion: 0,
      refreshTokenHash: 'stored-refresh-hash',
    });
    jest
      .mocked(bcrypt.compare)
      .mockResolvedValue(false as never);

    await expect(
      service.refresh({ refreshToken: 'reused-refresh-token' }),
    ).rejects.toThrow('Refresh token invalido');

    expect(jwt.signAsync).not.toHaveBeenCalled();
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
      avatarUrl: 'data:image/webp;base64,QUJDRA==',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      isActive: true,
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
      avatarUrl: 'data:image/webp;base64,QUJDRA==',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T11:00:00.000Z'),
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  /**
   * Garante que a fotografia de perfil pode ser atualizada sem expor dados sensiveis.
   * @return void
   */
  it('should update the authenticated user avatar', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 11 });
    prisma.user.update.mockResolvedValue({
      id: 11,
      name: 'Admin',
      biNumber: '32345678 1 AB3',
      postalCode: '8000-020',
      email: 'admin@teste.pt',
      avatarUrl: 'data:image/png;base64,QUJDRA==',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T11:00:00.000Z'),
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });

    const result = await service.updateAvatar(
      11,
      'data:image/png;base64,QUJDRA==',
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: { avatarUrl: 'data:image/png;base64,QUJDRA==' },
      }),
    );
    expect(result.user).toEqual({
      id: 11,
      name: 'Admin',
      biNumber: '32345678 1 AB3',
      postalCode: '8000-020',
      email: 'admin@teste.pt',
      avatarUrl: 'data:image/png;base64,QUJDRA==',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
      createdAt: new Date('2026-03-17T11:00:00.000Z'),
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  /**
   * Garante que o perfil de contas inativas nao e devolvido.
   * @return Promise<void>
   */
  it('should reject profile reads for inactive accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 13,
      name: 'Inativo',
      biNumber: '52345678 1 AB3',
      postalCode: '8000-040',
      email: 'inativo@teste.pt',
      avatarUrl: null,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
      isActive: false,
      createdAt: new Date('2026-03-17T11:00:00.000Z'),
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });

    await expect(service.me(13)).rejects.toThrow('Conta inativa');
  });

  /**
   * Garante que o logout incrementa a versao de autenticacao do utilizador.
   * @return Promise<void>
   */
  it('should increment authVersion on logout', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 14,
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({
      id: 14,
    });

    await expect(service.logout(14)).resolves.toEqual({
      message: 'Sessao terminada com sucesso',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 14 },
      data: {
        refreshTokenHash: null,
        authVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
      },
    });
  });

  /**
   * Garante que o logout rejeita contas inexistentes.
   * @return Promise<void>
   */
  it('should reject logout when the authenticated user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.logout(999)).rejects.toThrow(
      'Utilizador autenticado invalido',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
