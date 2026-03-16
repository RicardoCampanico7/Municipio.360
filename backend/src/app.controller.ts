import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Expos endpoints basicos de saudacao e health check da aplicacao.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador deve devolver respostas simples sem depender de estado mutavel local.
 */
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
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Devolve o estado de disponibilidade da API.
   * @return {{ ok: boolean }} Resultado simples de health check.
   */
  @Get('health')
  health() {
    return { ok: true };
  }
}
