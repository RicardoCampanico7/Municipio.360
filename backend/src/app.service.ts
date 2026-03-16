import { Injectable } from '@nestjs/common';

/**
 * Centraliza operacoes simples de apoio ao controlador raiz.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O servico deve devolver respostas deterministicas e sem efeitos colaterais.
 */
@Injectable()
export class AppService {
  /**
   * Gera a mensagem base da aplicacao.
   * @return string Saudacao padrao do backend.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
