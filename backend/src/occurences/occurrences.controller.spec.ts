import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OccurrencesController } from './occurrences.controller';
import { OccurrencesService } from './occurrences.service';

/**
 * Valida a protecao das rotas internas do backoffice de ocorrencias.
 */
describe('OccurrencesController', () => {
  let controller: OccurrencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OccurrencesController],
      providers: [
        {
          provide: OccurrencesService,
          useValue: {
            findAll: jest.fn(),
            findMine: jest.fn(),
            findMineById: jest.fn(),
            findAllForOperator: jest.fn(),
            findOneForOperator: jest.fn(),
            listInternalComments: jest.fn(),
            createInternalComment: jest.fn(),
            findOnePublic: jest.fn(),
            uploadImages: jest.fn(),
            create: jest.fn(),
            updateStatus: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OccurrencesController>(OccurrencesController);
  });

  /**
   * Garante que a listagem de gestao exige JWT e roles internas.
   * @return void
   */
  it('should protect the management list route with JWT and backoffice roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.findAllForOperator,
    ) as unknown[];
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.findAllForOperator,
    ) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.OPERADOR, Role.ADMINISTRADOR]);
  });

  /**
   * Garante que o detalhe de gestao exige JWT e roles internas.
   * @return void
   */
  it('should protect the management detail route with JWT and backoffice roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.findOneForOperator,
    ) as unknown[];
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.findOneForOperator,
    ) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.OPERADOR, Role.ADMINISTRADOR]);
  });

  /**
   * Garante que a listagem de comentarios internos exige JWT e roles internas.
   * @return void
   */
  it('should protect the internal comments list route with JWT and backoffice roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.listInternalComments,
    ) as unknown[];
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.listInternalComments,
    ) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.OPERADOR, Role.ADMINISTRADOR]);
  });

  /**
   * Garante que a criacao de comentarios internos exige JWT e roles internas.
   * @return void
   */
  it('should protect the internal comments create route with JWT and backoffice roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.createInternalComment,
    ) as unknown[];
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.createInternalComment,
    ) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.OPERADOR, Role.ADMINISTRADOR]);
  });

  /**
   * Garante que a atualizacao de estado esta reservada ao backoffice.
   * @return void
   */
  it('should protect status updates with JWT and backoffice roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.updateStatus,
    ) as unknown[];
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.updateStatus,
    ) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.OPERADOR, Role.ADMINISTRADOR]);
  });

  /**
   * Garante que o upload de imagens exige autenticacao CIVIL.
   * @return void
   */
  it('should protect the image upload route with JWT and citizen role', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.uploadImages,
    ) as unknown[];
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.uploadImages,
    ) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.CIVIL]);
  });

  /**
   * Garante que a criacao de ocorrencias exige autenticacao CIVIL.
   * @return void
   */
  it('should protect creation with JWT and citizen role', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.create,
    ) as unknown[];
    const roles = Reflect.getMetadata(ROLES_KEY, controller.create) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.CIVIL]);
  });

  /**
   * Garante que a listagem propria exige autenticacao CIVIL.
   * @return void
   */
  it('should protect own occurrences listing with JWT and citizen role', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.findMine,
    ) as unknown[];
    const roles = Reflect.getMetadata(ROLES_KEY, controller.findMine) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.CIVIL]);
  });

  /**
   * Garante que a remocao de ocorrencias esta reservada ao backoffice.
   * @return void
   */
  it('should protect deletes with JWT and backoffice roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.remove,
    ) as unknown[];
    const roles = Reflect.getMetadata(ROLES_KEY, controller.remove) as Role[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([Role.OPERADOR, Role.ADMINISTRADOR]);
  });
});
