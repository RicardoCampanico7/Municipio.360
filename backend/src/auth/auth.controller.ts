import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Expos endpoints de registo, login e consulta do utilizador autenticado.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv As operacoes de autenticacao nao devem expor hashes nem dados sensiveis desnecessarios.
 */
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
  me(@Req() req: Request) {
    const authUser = req.user as { sub?: number } | undefined;
    return this.authService.me(Number(authUser?.sub));
  }
}
