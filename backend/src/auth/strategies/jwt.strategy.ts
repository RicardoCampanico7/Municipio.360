import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: number;
  email: string;
  name: string;
  role: Role;
  certStatus?: string;
  authVersion?: number;
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
   * @param prisma Acesso aos dados atuais da conta autenticada.
   */
  constructor(private readonly prisma: PrismaService) {
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
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Token invalido');
    }

    let currentUser:
      | {
          email: string;
          name: string;
          role: Role;
          certStatus: string;
        }
      | undefined;

    if (payload.authVersion !== undefined) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          certStatus: true,
          isActive: true,
          authVersion: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Conta inativa ou inexistente');
      }

      if (user.authVersion !== payload.authVersion) {
        throw new UnauthorizedException('Sessao expirada');
      }

      currentUser = user;
    }

    return {
      sub: payload.sub,
      email: currentUser?.email ?? payload.email,
      name: currentUser?.name ?? payload.name,
      role: currentUser?.role ?? payload.role,
      certStatus: currentUser?.certStatus ?? payload.certStatus,
      authVersion: payload.authVersion,
    };
  }
}
