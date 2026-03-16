import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Disponibiliza globalmente o servico Prisma a toda a aplicacao.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O modulo deve exportar uma unica abstracao de acesso a base de dados.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
