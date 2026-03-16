import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from './users.controller';

/**
 * Garante a correta instanciacao do controlador de utilizadores em teste.
 */
describe('UsersController', () => {
  let controller: UsersController;

  /**
   * Prepara o modulo de testes antes de cada caso.
   * @return Promise<void> Promessa resolvida apos a criacao do modulo.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  /**
   * Verifica se o controlador foi criado.
   * @return void
   */
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
