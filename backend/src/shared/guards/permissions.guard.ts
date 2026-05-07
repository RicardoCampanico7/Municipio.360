import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import {
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import {
  AppPermission,
  roleHasPermissions,
} from '../permissions/app-permissions';

/**
 * Garante acesso com base em permissoes funcionais centralizadas.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  /**
   * Recebe o refletor usado para ler metadata de permissoes.
   * @param reflector Servico de introspecao de metadata do Nest.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Decide se o pedido atual pode prosseguir com base nas permissoes do role.
   * @param context Contexto de execucao do Nest para o pedido atual.
   * @return boolean Valor que indica se o acesso e permitido.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<AppPermission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: Role } | undefined;

    if (!user?.role || !roleHasPermissions(user.role, requiredPermissions)) {
      throw new ForbiddenException('Sem permissoes');
    }

    return true;
  }
}
