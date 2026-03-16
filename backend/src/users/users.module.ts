import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';

/**
 * Agrupa os componentes de consulta de utilizadores.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O modulo deve disponibilizar o controlador com acesso ao Prisma e ao guard de roles.
 */
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [RolesGuard],
})
export class UsersModule {}
