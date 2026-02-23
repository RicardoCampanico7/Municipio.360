import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Role } from '@prisma/client';
  import { ROLES_KEY } from '../decorators/roles.decorator';
  
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
  
      // Se não houver @Roles, a rota não está limitada por roles
      if (!requiredRoles || requiredRoles.length === 0) return true;
  
      const request = context.switchToHttp().getRequest();
      const user = request.user as { role?: Role } | undefined;
  
      // Se chegaste aqui, é porque a rota exige roles.
      // Logo, se não houver user, ou não tiver role, bloqueia.
      if (!user?.role) {
        throw new ForbiddenException('Sem permissões');
      }
  
      const allowed = requiredRoles.includes(user.role);
      if (!allowed) throw new ForbiddenException('Sem permissões');
  
      return true;
    }
  }