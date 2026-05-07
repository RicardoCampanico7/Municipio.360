import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Garante a correta instanciacao do controlador de autenticacao em teste.
 */
describe('AuthController', () => {
  let controller: AuthController;

  /**
   * Prepara o modulo de testes antes de cada caso.
   * @return Promise<void> Promessa resolvida apos a criacao do modulo.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            me: jest.fn(),
            updateAvatar: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  /**
   * Verifica se o controlador foi criado.
   * @return void
   */
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
