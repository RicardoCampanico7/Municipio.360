import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { OccurrencesController } from './occurrences.controller';
import { OccurrencesService } from './occurrences.service';

/**
 * Reune os componentes de gestao de ocorrencias publicas e privadas.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O modulo deve disponibilizar os servicos e guards necessarios a gestao de ocorrencias.
 */
@Module({
  imports: [PrismaModule],
  controllers: [OccurrencesController],
  providers: [OccurrencesService, RolesGuard],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}
