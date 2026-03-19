import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CertificationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = {
  id: number;
  name: string;
  biNumber: string;
  postalCode: string;
  email: string;
  role: Role;
  certStatus: CertificationStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Implementa a logica de registo, login e consulta do utilizador autenticado.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv As passwords nunca saem do servico em texto simples nem em hash.
 */
@Injectable()
export class AuthService {
  /**
   * Recebe os servicos necessarios a autenticacao.
   * @param prisma Acesso a persistencia de utilizadores.
   * @param jwt Servico para emissao de tokens JWT.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Construi um objeto de utilizador seguro para resposta da API.
   * @param user Utilizador obtido da base de dados.
   * @return Dados do utilizador sem informacao sensivel.
   */
  private buildSafeUserResponse(user: SafeUser) {
    return {
      id: user.id,
      name: user.name,
      biNumber: user.biNumber,
      postalCode: user.postalCode,
      email: user.email,
      role: user.role,
      certStatus: user.certStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Regista um novo utilizador com dados normalizados e password cifrada.
   * @param dto Dados recebidos no pedido de registo.
   * @return Objeto com mensagem de sucesso e utilizador seguro.
   * Pre-condicao: O email ainda nao pode existir.
   * Pos-condicao: O utilizador fica persistido na base de dados.
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedBiNumber = dto.biNumber.trim().toUpperCase();
    const normalizedPostalCode = dto.postalCode.trim();
    const normalizedName = dto.name.trim();

    const exists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException('Email ja registado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: normalizedName,
        biNumber: normalizedBiNumber,
        postalCode: normalizedPostalCode,
        email: normalizedEmail,
        passwordHash,
        certStatus: CertificationStatus.CERTIFIED,
      },
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

    return {
      message: 'Utilizador registado com sucesso',
      user: this.buildSafeUserResponse(user),
    };
  }

  /**
   * Valida credenciais e emite um token JWT para o utilizador autenticado.
   * @param dto Credenciais de login.
   * @return Token de acesso e dados seguros do utilizador.
   * Pre-condicao: O utilizador deve existir e a password deve coincidir.
   * Pos-condicao: O token JWT fica pronto para ser usado nos endpoints protegidos.
   */
  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        certStatus: true,
        biNumber: true,
        postalCode: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      certStatus: user.certStatus,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      user: this.buildSafeUserResponse(user),
    };
  }

  /**
   * Obtem o perfil atualizado do utilizador autenticado.
   * @param userId Identificador do utilizador autenticado.
   * @return Objeto com o perfil seguro do utilizador.
   * Pre-condicao: O identificador deve corresponder a um utilizador existente.
   * Pos-condicao: O perfil devolvido reflete o estado atual da base de dados.
   */
  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    return {
      user: this.buildSafeUserResponse(user),
    };
  }
}
