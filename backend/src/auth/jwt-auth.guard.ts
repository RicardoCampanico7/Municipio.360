import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Ativa autenticacao JWT nos endpoints protegidos.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O guard deve delegar a validacao do token para a strategy JWT configurada.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
