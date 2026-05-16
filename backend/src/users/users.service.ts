import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Encapsula a logica de consulta de utilizadores para perfis internos.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/05/2026
 * @inv O servico nao deve expor hashes nem outros dados sensiveis dos utilizadores.
 */
@Injectable()
export class UsersService {
  /**
   * Recebe o servico Prisma usado nas consultas de utilizadores.
   * @param prisma Servico Prisma da aplicacao.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devolve a lista de utilizadores com campos seguros para consulta interna.
   * @return Lista de utilizadores ordenada por data de criacao decrescente.
   * Pre-condicao: O chamador deve ter role OPERADOR ou ADMINISTRADOR.
   * Pos-condicao: Nenhum campo sensivel (hash, refreshToken) e incluido na resposta.
   */
  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        biNumber: true,
        postalCode: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
