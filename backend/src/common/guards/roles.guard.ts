import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Garante que apenas utilizadores com roles autorizados acedem a rotas protegidas.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv Uma rota sem roles declarados deve permanecer acessivel a quem ja passou os guards anteriores.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Recebe o refletor usado para ler metadata de roles.
   * @param reflector Servico de introspecao de metadata do Nest.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Decide se o pedido atual pode prosseguir com base no role do utilizador.
   * @param context Contexto de execucao do Nest para o pedido atual.
   * @return boolean Valor que indica se o acesso e permitido.
   * Pre-condicao: O utilizador autenticado deve estar disponivel em req.user nas rotas protegidas por roles.
   * Pos-condicao: E lancada excecao 403 quando o utilizador nao tem permissao.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: Role } | undefined;

    if (!user?.role) {
      throw new ForbiddenException('Sem permissoes');
    }

    const allowed = requiredRoles.includes(user.role);
    if (!allowed) throw new ForbiddenException('Sem permissoes');

    return true;
  }
}
