import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

/**
 * Agrupa os componentes responsaveis pelos dados publicos do menu.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O modulo deve disponibilizar apenas dados publicos e estaticos do menu.
 */
@Module({
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
