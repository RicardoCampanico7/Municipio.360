import { Role } from '@prisma/client';

/**
 * Permissoes funcionais conhecidas pela API.
 */
export enum AppPermission {
  OCCURRENCES_CREATE = 'occurrences:create',
  OCCURRENCES_READ_OWN = 'occurrences:read-own',
  OCCURRENCES_MANAGE = 'occurrences:manage',
  USERS_READ = 'users:read',
}

/**
 * Matriz central de permissoes por role.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly AppPermission[]> = {
  [Role.CIVIL]: [
    AppPermission.OCCURRENCES_CREATE,
    AppPermission.OCCURRENCES_READ_OWN,
  ],
  [Role.OPERADOR]: [AppPermission.OCCURRENCES_MANAGE, AppPermission.USERS_READ],
  [Role.ADMINISTRADOR]: [
    AppPermission.OCCURRENCES_MANAGE,
    AppPermission.USERS_READ,
  ],
};

/**
 * Verifica se um role possui todas as permissoes pedidas.
 * @param role Role autenticado.
 * @param permissions Permissoes exigidas pela rota.
 * @return boolean Verdadeiro quando todas as permissoes existem na matriz.
 */
export function roleHasPermissions(
  role: Role,
  permissions: readonly AppPermission[],
) {
  const grantedPermissions = ROLE_PERMISSIONS[role] ?? [];

  return permissions.every((permission) =>
    grantedPermissions.includes(permission),
  );
}
