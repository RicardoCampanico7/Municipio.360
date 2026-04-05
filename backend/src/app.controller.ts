import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AppHealthResponseDto,
} from './docs/dto/app-response.dto';
import { AppService } from './app.service';

/**
 * Expos endpoints basicos de saudacao e health check da aplicacao.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador deve devolver respostas simples sem depender de estado mutavel local.
 */
@ApiTags('app')
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
  @ApiOperation({ summary: 'Mensagem base da API' })
  @ApiOkResponse({
    description: 'Mensagem devolvida com sucesso',
    schema: {
      type: 'string',
      example: 'Hello World!',
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
  @ApiOperation({ summary: 'Health check global da API' })
  @ApiOkResponse({
    description: 'API operacional',
    type: AppHealthResponseDto,
  })
  health() {
    return { ok: true };
  }
}
