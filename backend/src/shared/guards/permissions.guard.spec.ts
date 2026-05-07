import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  AppPermission,
  roleHasPermissions,
} from '../permissions/app-permissions';
import { PermissionsGuard } from './permissions.guard';

/**
 * Valida a matriz central de permissoes e o guard funcional.
 */
describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  /**
   * Garante que a matriz de roles preserva os acessos esperados.
   * @return void
   */
  it.each([
    [Role.CIVIL, AppPermission.OCCURRENCES_CREATE, true],
    [Role.CIVIL, AppPermission.OCCURRENCES_MANAGE, false],
    [Role.OPERADOR, AppPermission.OCCURRENCES_MANAGE, true],
    [Role.OPERADOR, AppPermission.USERS_READ, true],
    [Role.ADMINISTRADOR, AppPermission.OCCURRENCES_MANAGE, true],
    [Role.ADMINISTRADOR, AppPermission.USERS_READ, true],
  ])(
    'should map %s to %s access as %s',
    (role, permission, expectedAccess) => {
      expect(roleHasPermissions(role, [permission])).toBe(expectedAccess);
    },
  );

  /**
   * Garante que rotas sem metadata de permissoes continuam acessiveis.
   * @return void
   */
  it('should allow access when no permissions are declared', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  /**
   * Garante que um pedido sem role autenticado e rejeitado.
   * @return void
   */
  it('should reject access when the authenticated user has no role', () => {
    reflector.getAllAndOverride.mockReturnValue([AppPermission.USERS_READ]);

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
   * Garante que um role sem a permissao funcional nao acede ao recurso.
   * @return void
   */
  it('should reject access when the authenticated role lacks permission', () => {
    reflector.getAllAndOverride.mockReturnValue([AppPermission.USERS_READ]);

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
   * Garante que um role com todas as permissoes exigidas acede.
   * @return void
   */
  it('should allow access when the authenticated role has every permission', () => {
    reflector.getAllAndOverride.mockReturnValue([
      AppPermission.OCCURRENCES_MANAGE,
      AppPermission.USERS_READ,
    ]);

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
