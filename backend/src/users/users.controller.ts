import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { usersSwaggerExamples } from '../docs/examples/users-swagger.examples';
import { ApiErrorResponseDto } from '../shared/dto/api-error-response.dto';
import { SafeUserResponseDto } from '../auth/dto/responses/auth-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import { UsersService } from './users.service';

/**
 * Expos operacoes de consulta de utilizadores para perfis internos autorizados.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador nao deve expor hashes nem outros dados sensiveis dos utilizadores.
 */
@ApiTags('users')
@ApiBearerAuth('bearer')
@ApiExtraModels(SafeUserResponseDto, ApiErrorResponseDto)
@Controller('users')
export class UsersController {
  /**
   * Recebe o servico responsavel pelas operacoes de consulta de utilizadores.
   * @param usersService Servico de utilizadores da aplicacao.
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Lista os utilizadores para operadores e administradores.
   * @return Lista de utilizadores com campos seguros para operacao.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @Get()
  @ApiOperation({
    summary: 'Listar utilizadores para perfis OPERADOR e ADMINISTRADOR',
    description:
      'Devolve a lista de utilizadores com campos seguros para consulta interna no backoffice.',
  })
  @ApiHeader({
    name: 'Authorization',
    description:
      'JWT recebido em /auth/login no formato Bearer <token> para um OPERADOR ou ADMINISTRADOR.',
    required: true,
    example: usersSwaggerExamples.authorizationHeader,
  })
  @ApiOkResponse({
    description: 'Lista de utilizadores devolvida',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: getSchemaPath(SafeUserResponseDto) },
        },
        examples: usersSwaggerExamples.listSuccess,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        examples: usersSwaggerExamples.listUnauthorized,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Sem permissao para consultar',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        examples: usersSwaggerExamples.listForbidden,
      },
    },
  })
  findAll() {
    return this.usersService.findAll();
  }
}
