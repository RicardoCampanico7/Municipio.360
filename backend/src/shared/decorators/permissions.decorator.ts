import { SetMetadata } from '@nestjs/common';
import { AppPermission } from '../permissions/app-permissions';

/**
 * Chave de metadata usada para associar permissoes funcionais a handlers.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Associa um conjunto de permissoes funcionais a um endpoint ou controlador.
 * @param permissions Permissoes necessarias para aceder ao recurso.
 * @return Decorator Nest com metadata de autorizacao.
 */
export const Permissions = (...permissions: AppPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
