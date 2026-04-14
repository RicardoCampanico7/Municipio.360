import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { menuSwaggerExamples } from '../docs/examples/menu-swagger.examples';
import { PublicMenuResponseDto } from './dto/responses/menu-response.dto';
import { MenuService } from './menu.service';

/**
 * Expos endpoints publicos para obtencao de dados do menu do frontend.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador deve devolver apenas dados de navegacao publicos e sem estado sensivel.
 */
@ApiTags('menu')
@ApiExtraModels(PublicMenuResponseDto)
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
  @ApiOperation({
    summary: 'Obter dados publicos do menu',
    description:
      'Devolve o menu publico usado pelo frontend. O idioma pode ser enviado na query string.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    example: 'pt',
    description:
      'Idioma opcional do menu. Valores suportados: pt, en, es e fr. Outros valores fazem fallback para pt.',
  })
  @ApiOkResponse({
    description: 'Menu publico devolvido com sucesso',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(PublicMenuResponseDto) },
        examples: menuSwaggerExamples.publicMenuSuccess,
      },
    },
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
  @ApiOperation({
    summary: 'Alias publico para obter os dados do menu',
    description:
      'Alias de conveniencia que devolve exatamente a mesma estrutura do endpoint GET /menu.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    example: 'pt',
    description:
      'Idioma opcional do menu. Valores suportados: pt, en, es e fr. Outros valores fazem fallback para pt.',
  })
  @ApiOkResponse({
    description: 'Menu publico devolvido com sucesso',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(PublicMenuResponseDto) },
        examples: menuSwaggerExamples.publicMenuSuccess,
      },
    },
  })
  findPublicAlias(@Query('lang') lang?: string) {
    return this.menuService.getPublicMenu(lang);
  }
}
