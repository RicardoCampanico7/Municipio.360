import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Encapsula o ciclo de vida do cliente Prisma dentro do Nest.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv A ligacao a base de dados deve ser aberta no init do modulo e fechada no destroy.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Estabelece a ligacao a base de dados no arranque do modulo.
   * @return Promise<void> Promessa resolvida apos ligacao bem sucedida.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Fecha a ligacao a base de dados ao terminar o modulo.
   * @return Promise<void> Promessa resolvida apos libertacao dos recursos.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
