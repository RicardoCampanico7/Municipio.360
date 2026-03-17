import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

/**
 * Valida o controlo de acesso por role nas rotas protegidas.
 */
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  /**
   * Garante que rotas sem metadata de roles continuam acessiveis.
   * @return void
   */
  it('should allow access when no roles are declared', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  /**
   * Garante que um pedido sem role autenticado e rejeitado.
   * @return void
   */
  it('should reject access when the authenticated user has no role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OPERADOR]);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: {} }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  /**
   * Garante que um role nao autorizado nao entra no backoffice.
   * @return void
   */
  it('should reject access when the authenticated user role is not allowed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OPERADOR, Role.ADMINISTRADOR]);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: Role.CIVIL } }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  /**
   * Garante que operadores e administradores autenticados podem aceder.
   * @return void
   */
  it('should allow access when the authenticated user role is allowed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OPERADOR, Role.ADMINISTRADOR]);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: Role.ADMINISTRADOR } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
