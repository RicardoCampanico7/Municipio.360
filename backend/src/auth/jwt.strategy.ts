import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: number;
  email: string;
  name: string;
  role: Role;
  certStatus?: string;
};

/**
 * Valida o payload do JWT e constroi o utilizador autenticado da request.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O payload validado deve conter sempre o identificador e o role do utilizador.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Configura a strategy JWT com o segredo da aplicacao.
   */
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * Traduz o payload JWT para o objeto de utilizador autenticado.
   * @param payload Payload validado do token JWT.
   * @return Objeto de utilizador colocado em req.user.
   */
  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      certStatus: payload.certStatus,
    };
  }
}
