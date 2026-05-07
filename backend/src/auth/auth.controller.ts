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
  AuthMeResponseDto,
  AuthRegisterResponseDto,
  SafeUserResponseDto,
} from './dto/responses/auth-response.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
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
  RegisterDto,
  UpdateAvatarDto,
  AuthLoginResponseDto,
  AuthRegisterResponseDto,
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
    description:
      'JWT recebido em /auth/login no formato Bearer <token>.',
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
   * Atualiza ou remove a fotografia de perfil do utilizador autenticado.
   * @param req Pedido HTTP com o utilizador autenticado pelo guard JWT.
   * @param dto Nova fotografia em data URL, ou null para remover.
   * @return Perfil seguro atualizado do utilizador autenticado.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  @ApiBearerAuth('bearer')
  @ApiHeader({
    name: 'Authorization',
    description:
      'JWT recebido em /auth/login no formato Bearer <token>.',
    required: true,
    example: authSwaggerExamples.authorizationHeader,
  })
  @ApiOperation({
    summary: 'Atualizar fotografia de perfil',
    description:
      'Atualiza a fotografia de perfil do utilizador autenticado. Envia avatarUrl null para remover a fotografia atual.',
  })
  @ApiBody({
    description: 'Nova fotografia de perfil do utilizador autenticado.',
    required: true,
    schema: { $ref: getSchemaPath(UpdateAvatarDto) },
  })
  @ApiOkResponse({
    description: 'Fotografia de perfil atualizada com sucesso',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(AuthMeResponseDto) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Fotografia de perfil invalida',
    content: {
      'application/json': {
        schema: {
          oneOf: [
            { $ref: getSchemaPath(ValidationErrorResponseDto) },
            { $ref: getSchemaPath(ApiErrorResponseDto) },
          ],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao, token invalido ou utilizador inexistente',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
      },
    },
  })
  updateAvatar(@Req() req: Request, @Body() dto: UpdateAvatarDto) {
    const authUser = req.user as { sub?: number } | undefined;
    return this.authService.updateAvatar(Number(authUser?.sub), dto.avatarUrl);
  }
}
