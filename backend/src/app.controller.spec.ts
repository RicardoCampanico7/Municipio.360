import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Valida o comportamento base do AppController.
 */
describe('AppController', () => {
  let appController: AppController;

  /**
   * Prepara o modulo de testes antes de cada caso.
   * @return Promise<void> Promessa resolvida apos a criacao do modulo.
   */
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  /**
   * Agrupa os testes do endpoint raiz.
   */
  describe('root', () => {
    /**
     * Verifica se o endpoint raiz devolve a mensagem esperada.
     * @return void
     */
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
