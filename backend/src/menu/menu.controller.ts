import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';

/**
 * Expos endpoints publicos para obtencao de dados do menu do frontend.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador deve devolver apenas dados de navegacao publicos e sem estado sensivel.
 */
@ApiTags('menu')
@Controller('menu')
export class MenuController {
  /**
   * Recebe o servico que gera os dados do menu.
   * @param menuService Servico de menu.
   */
  constructor(private readonly menuService: MenuService) {}

  /**
   * Devolve os dados publicos do menu para um idioma opcional.
   * @param lang Idioma pretendido para as labels do menu.
   * @return Estrutura publica do menu.
   */
  @Get()
  @ApiOperation({ summary: 'Obter dados publicos do menu' })
  @ApiQuery({ name: 'lang', required: false, example: 'pt' })
  @ApiResponse({
    status: 200,
    description: 'Menu publico devolvido com sucesso',
  })
  findPublic(@Query('lang') lang?: string) {
    return this.menuService.getPublicMenu(lang);
  }

  /**
   * Devolve um alias publico para os mesmos dados do menu.
   * @param lang Idioma pretendido para as labels do menu.
   * @return Estrutura publica do menu.
   */
  @Get('public')
  @ApiOperation({ summary: 'Alias publico para obter os dados do menu' })
  @ApiQuery({ name: 'lang', required: false, example: 'pt' })
  @ApiResponse({
    status: 200,
    description: 'Menu publico devolvido com sucesso',
  })
  findPublicAlias(@Query('lang') lang?: string) {
    return this.menuService.getPublicMenu(lang);
  }
}
