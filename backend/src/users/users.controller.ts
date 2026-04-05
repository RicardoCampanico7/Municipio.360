import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiErrorResponseDto } from '../docs/dto/api-error-response.dto';
import { SafeUserResponseDto } from '../docs/dto/auth-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Expos operacoes de consulta de utilizadores para perfis internos autorizados.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador nao deve expor hashes nem outros dados sensiveis dos utilizadores.
 */
@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  /**
   * Recebe o servico Prisma usado nas consultas de utilizadores.
   * @param prisma Servico Prisma da aplicacao.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Lista os utilizadores para operadores e administradores.
   * @return Lista de utilizadores com campos seguros para operacao.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @Get()
  @ApiOperation({
    summary: 'Listar utilizadores para perfis OPERADOR e ADMINISTRADOR',
  })
  @ApiOkResponse({
    description: 'Lista de utilizadores devolvida',
    type: SafeUserResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissao para consultar',
    type: ApiErrorResponseDto,
  })
  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        biNumber: true,
        postalCode: true,
        email: true,
        role: true,
        certStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
