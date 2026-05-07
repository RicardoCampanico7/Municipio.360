import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { authSwaggerExamples } from '../docs/examples/auth-swagger.examples';
import {
  ApiErrorResponseDto,
  ValidationErrorResponseDto,
} from '../shared/dto/api-error-response.dto';
import {
  AuthLoginResponseDto,
  AuthLogoutResponseDto,
  AuthMeResponseDto,
  AuthRefreshResponseDto,
  AuthRegisterResponseDto,
  SafeUserResponseDto,
} from './dto/responses/auth-response.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

/**
 * Expos endpoints de registo, login e consulta do utilizador autenticado.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv As operacoes de autenticacao nao devem expor hashes nem dados sensiveis desnecessarios.
 */
@ApiTags('auth')
@ApiExtraModels(
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  UpdateAvatarDto,
  AuthLoginResponseDto,
  AuthLogoutResponseDto,
  AuthRegisterResponseDto,
  AuthRefreshResponseDto,
  AuthMeResponseDto,
  SafeUserResponseDto,
  ApiErrorResponseDto,
  ValidationErrorResponseDto,
)
@Controller('auth')
export class AuthController {
  /**
   * Recebe o servico responsavel pelas operacoes de autenticacao.
   * @param authService Servico de autenticacao da aplicacao.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Autentica um utilizador e devolve o token JWT com os dados seguros do perfil.
   * @param dto Credenciais recebidas no pedido.
   * @return Resultado do processo de login.
   * Pre-condicao: O email e a password devem ser validos.
   * Pos-condicao: E devolvido um token apenas quando as credenciais sao corretas.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar utilizador e obter JWT',
    description:
      'Valida as credenciais submetidas e devolve um accessToken JWT para consumir endpoints protegidos.',
  })
  @ApiBody({
    description: 'Credenciais do utilizador registado.',
    required: true,
    schema: { $ref: getSchemaPath(LoginDto) },
    examples: authSwaggerExamples.loginRequest,
  })
  @ApiOkResponse({
    description: 'Login efetuado com sucesso',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(AuthLoginResponseDto) },
        examples: authSwaggerExamples.loginSuccess,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Pedido invalido',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ValidationErrorResponseDto) },
        examples: authSwaggerExamples.loginBadRequest,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciais invalidas',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        examples: authSwaggerExamples.loginUnauthorized,
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Renova a sessao usando um refresh token valido.
   * @param dto Refresh token emitido anteriormente.
   * @return Novo par de tokens.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Valida um refresh token ativo, roda o refresh token guardado e devolve um novo par de tokens.',
  })
  @ApiBody({
    description: 'Refresh token recebido no login ou refresh anterior.',
    required: true,
    schema: { $ref: getSchemaPath(RefreshTokenDto) },
    examples: authSwaggerExamples.refreshRequest,
  })
  @ApiOkResponse({
    description: 'Sessao renovada',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(AuthRefreshResponseDto) },
        examples: authSwaggerExamples.refreshSuccess,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Pedido invalido',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ValidationErrorResponseDto) },
        examples: authSwaggerExamples.refreshBadRequest,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token invalido ou expirado',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        examples: authSwaggerExamples.refreshUnauthorized,
      },
    },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  /**
   * Regista um novo utilizador civil com os dados reais submetidos.
   * @param dto Dados necessarios ao registo.
   * @return Resultado do registo com os dados seguros do utilizador criado.
   * Pre-condicao: O email nao pode existir previamente.
   * Pos-condicao: O utilizador fica persistido com password em hash.
   */
  @Post('register')
  @ApiOperation({
    summary: 'Registar novo utilizador',
    description:
      'Cria um novo utilizador. Quando o campo role nao e enviado, o registo fica associado a CIVIL.',
  })
  @ApiBody({
    description: 'Dados do novo utilizador a registar.',
    required: true,
    schema: { $ref: getSchemaPath(RegisterDto) },
    examples: authSwaggerExamples.registerRequest,
  })
  @ApiCreatedResponse({
    description: 'Utilizador registado com sucesso',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(AuthRegisterResponseDto) },
        examples: authSwaggerExamples.registerSuccess,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Dados invalidos ou fotografia de perfil rejeitada',
    content: {
      'application/json': {
        schema: {
          oneOf: [
            { $ref: getSchemaPath(ValidationErrorResponseDto) },
            { $ref: getSchemaPath(ApiErrorResponseDto) },
          ],
        },
        examples: authSwaggerExamples.registerBadRequest,
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email ja registado',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        examples: authSwaggerExamples.registerConflict,
      },
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Devolve os dados atualizados do utilizador autenticado.
   * @param req Pedido HTTP com o utilizador autenticado pelo guard JWT.
   * @return Perfil seguro do utilizador autenticado.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT recebido em /auth/login no formato Bearer <token>.',
    required: true,
    example: authSwaggerExamples.authorizationHeader,
  })
  @ApiOperation({
    summary: 'Obter perfil do utilizador autenticado',
    description:
      'Devolve o perfil atualizado do utilizador associado ao token Bearer enviado no header Authorization.',
  })
  @ApiOkResponse({
    description: 'Perfil devolvido com sucesso',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(AuthMeResponseDto) },
        examples: authSwaggerExamples.meSuccess,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao, token invalido ou utilizador inexistente',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
        examples: authSwaggerExamples.meUnauthorized,
      },
    },
  })
  me(@Req() req: Request) {
  const authUser = req.user as { sub?: number } | undefined;
  return this.authService.me(Number(authUser?.sub));
}

/**
 * Invalida sessoes versionadas do utilizador autenticado.
 * @param req Pedido HTTP com o utilizador autenticado pelo guard JWT.
 * @return Mensagem de logout concluido.
 */
@UseGuards(JwtAuthGuard)
@Post('logout')
@HttpCode(HttpStatus.OK)
@ApiBearerAuth('bearer')
@ApiHeader({
  name: 'Authorization',
  description:
    'JWT recebido em /auth/login ou /auth/refresh no formato Bearer <token>.',
  required: true,
  example: authSwaggerExamples.authorizationHeader,
})
@ApiOperation({
  summary: 'Terminar sessao autenticada',
  description:
    'Remove o refresh token guardado e incrementa a versao de autenticacao do utilizador para invalidar tokens JWT versionados emitidos anteriormente.',
})
@ApiOkResponse({
  description: 'Sessao terminada',
  content: {
    'application/json': {
      schema: { $ref: getSchemaPath(AuthLogoutResponseDto) },
      examples: authSwaggerExamples.logoutSuccess,
    },
  },
})
@ApiUnauthorizedResponse({
  description: 'Sem autenticacao, token invalido ou conta inativa',
  content: {
    'application/json': {
      schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
      examples: authSwaggerExamples.logoutUnauthorized,
    },
  },
})
logout(@Req() req: Request) {
  const authUser = req.user as { sub?: number } | undefined;
  return this.authService.logout(Number(authUser?.sub));
}

