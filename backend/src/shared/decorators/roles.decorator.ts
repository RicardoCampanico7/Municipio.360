import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Chave de metadata usada para associar roles a handlers protegidos.
 */
export const ROLES_KEY = 'roles';

/**
 * Associa um conjunto de roles permitidos a um endpoint ou controlador.
 * @param roles Roles autorizados a aceder ao recurso.
 * @return Decorator Nest com metadata de autorizacao.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
