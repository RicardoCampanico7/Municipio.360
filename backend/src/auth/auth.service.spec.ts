import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

/**
 * Garante a correta instanciacao do servico de autenticacao em teste.
 */
describe('AuthService', () => {
  let service: AuthService;

  /**
   * Prepara o modulo de testes antes de cada caso.
   * @return Promise<void> Promessa resolvida apos a criacao do modulo.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  /**
   * Verifica se o servico foi criado.
   * @return void
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
