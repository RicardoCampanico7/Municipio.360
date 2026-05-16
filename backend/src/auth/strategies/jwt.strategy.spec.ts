import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * Valida a construcao do utilizador autenticado a partir do JWT.
 */
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    strategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  /**
   * Garante compatibilidade com tokens emitidos antes de existir authVersion.
   * @return Promise<void>
   */
  it('should accept legacy tokens without authVersion during migration', async () => {
    await expect(
      strategy.validate({
        sub: 7,
        email: 'user@example.com',
        name: 'User',
        role: Role.CIVIL,
      }),
    ).resolves.toEqual({
      sub: 7,
      email: 'user@example.com',
      name: 'User',
      role: Role.CIVIL,
      authVersion: undefined,
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  /**
   * Garante que tokens versionados exigem uma conta ativa.
   * @return Promise<void>
   */
  it('should reject versioned tokens for inactive accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      isActive: false,
      authVersion: 0,
    });

    await expect(
      strategy.validate({
        sub: 7,
        email: 'user@example.com',
        name: 'User',
        role: Role.CIVIL,
        authVersion: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  /**
   * Garante que a diferenca de authVersion invalida sessoes antigas.
   * @return Promise<void>
   */
  it('should reject versioned tokens when authVersion no longer matches', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      isActive: true,
      authVersion: 2,
    });

    await expect(
      strategy.validate({
        sub: 7,
        email: 'user@example.com',
        name: 'User',
        role: Role.CIVIL,
        authVersion: 1,
      }),
    ).rejects.toThrow('Sessao expirada');
  });

  /**
   * Garante que tokens versionados validos entram com o role do token.
   * @return Promise<void>
   */
  it('should accept active accounts when authVersion matches', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      isActive: true,
      authVersion: 1,
    });

    await expect(
      strategy.validate({
        sub: 7,
        email: 'user@example.com',
        name: 'User',
        role: Role.OPERADOR,
        authVersion: 1,
      }),
    ).resolves.toEqual({
      sub: 7,
      email: 'user@example.com',
      name: 'User',
      role: Role.OPERADOR,
      authVersion: 1,
    });
  });
});
