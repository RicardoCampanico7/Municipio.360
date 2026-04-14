import { Controller, Get } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { appSwaggerExamples } from './docs/examples/app-swagger.examples';
import {
  AppHealthResponseDto,
} from './app/dto/app-response.dto';
import { AppService } from './app.service';

/**
 * Expos endpoints basicos de saudacao e health check da aplicacao.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador deve devolver respostas simples sem depender de estado mutavel local.
 */
@ApiTags('app')
@ApiExtraModels(AppHealthResponseDto)
@Controller()
export class AppController {
  /**
   * Recebe o servico base da aplicacao.
   * @param appService Servico com operacoes basicas da aplicacao.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Devolve a mensagem base da aplicacao.
   * @return string Mensagem simples usada para validar o endpoint raiz.
   */
  @Get()
  @ApiOperation({
    summary: 'Mensagem base da API',
    description:
      'Endpoint simples para validar rapidamente se a API esta acessivel.',
  })
  @ApiOkResponse({
    description: 'Mensagem devolvida com sucesso',
    content: {
      'text/plain': {
        schema: { type: 'string' },
        examples: appSwaggerExamples.helloSuccess,
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Devolve o estado de disponibilidade da API.
   * @return {{ ok: boolean }} Resultado simples de health check.
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check global da API',
    description:
      'Confirma que a API esta operacional e pronta para receber pedidos.',
  })
  @ApiOkResponse({
    description: 'API operacional',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(AppHealthResponseDto) },
        examples: appSwaggerExamples.healthSuccess,
      },
    },
  })
  health() {
    return { ok: true };
  }
}
