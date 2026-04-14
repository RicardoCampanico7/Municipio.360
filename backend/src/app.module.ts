import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

/**
 * Agrega os modulos principais da aplicacao backend.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv Os modulos registados devem manter a composicao necessaria para expor a API completa.
 */
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    OccurrencesModule,
    MenuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
