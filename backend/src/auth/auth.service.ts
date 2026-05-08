import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CertificationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = {
  id: number;
  name: string;
  biNumber: string;
  postalCode: string;
  email: string;
  avatarUrl?: string | null;
  role: Role;
  certStatus: CertificationStatus;
  isActive?: boolean;
  authVersion?: number;
  refreshTokenHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type AuthTokenUser = Pick<
  SafeUser,
  'id' | 'name' | 'email' | 'role' | 'certStatus'
> & {
  authVersion: number;
};

type RefreshTokenPayload = {
  sub: number;
  authVersion: number;
  tokenType?: string;
};

const AVATAR_DATA_URL_PREFIX =
  /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i;
const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024;
const REFRESH_TOKEN_EXPIRES_IN = '7d';

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
   * Valida e normaliza a fotografia de perfil opcional recebida no registo.
   * @param avatarUrl Data URL recebida do cliente.
   * @return URL normalizada ou null quando a foto nao foi enviada.
   */
  private normalizeAvatarUrl(avatarUrl: string | null | undefined) {
    const normalizedAvatarUrl =
      typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    if (!normalizedAvatarUrl) {
      return null;
    }

    if (!AVATAR_DATA_URL_PREFIX.test(normalizedAvatarUrl)) {
      throw new BadRequestException('Fotografia de perfil invalida');
    }

    const base64Payload = normalizedAvatarUrl
      .split(',', 2)[1]
      ?.replace(/\s+/g, '');
    if (!base64Payload || !/^[A-Za-z0-9+/=]+$/.test(base64Payload)) {
      throw new BadRequestException('Fotografia de perfil invalida');
    }

    const paddingLength = base64Payload.endsWith('==')
      ? 2
      : base64Payload.endsWith('=')
        ? 1
        : 0;
    const estimatedSizeInBytes =
      Math.floor((base64Payload.length * 3) / 4) - paddingLength;

    if (estimatedSizeInBytes > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException(
        'A fotografia de perfil nao pode exceder 3 MB',
      );
    }

    return normalizedAvatarUrl;
  }

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
      avatarUrl: user.avatarUrl ?? undefined,
      role: user.role,
      certStatus: user.certStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Constroi o payload minimo usado nos access tokens.
   * @param user Utilizador autenticado.
   * @return Payload assinado no JWT de acesso.
   */
  private buildAccessTokenPayload(user: AuthTokenUser) {
    return {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      certStatus: user.certStatus,
      authVersion: user.authVersion,
    };
  }

  /**
   * Emite um par access/refresh token e guarda apenas a hash do refresh token.
   * @param user Utilizador autenticado.
   * @return Tokens prontos para resposta.
   */
  private async issueTokenPair(user: AuthTokenUser) {
    const accessToken = await this.jwt.signAsync(
      this.buildAccessTokenPayload(user),
    );
    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        authVersion: user.authVersion,
        tokenType: 'refresh',
      },
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
      select: { id: true },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
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
    const normalizedAvatarUrl = this.normalizeAvatarUrl(dto.avatarUrl);
    const normalizedRole = dto.role ?? Role.CIVIL;

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
        avatarUrl: normalizedAvatarUrl,
        passwordHash,
        role: normalizedRole,
        certStatus: CertificationStatus.CERTIFIED,
      },
      select: {
        id: true,
        name: true,
        biNumber: true,
        postalCode: true,
        email: true,
        avatarUrl: true,
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
        avatarUrl: true,
        role: true,
        certStatus: true,
        isActive: true,
        authVersion: true,
        biNumber: true,
        postalCode: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      user: this.buildSafeUserResponse(user),
    };
  }

  /**
   * Renova a sessao usando refresh token rotacionavel.
   * @param dto Refresh token recebido do cliente.
   * @return Novo par access/refresh token.
   */
  async refresh(dto: RefreshTokenDto) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (
      !payload.sub ||
      payload.authVersion === undefined ||
      payload.tokenType !== 'refresh'
    ) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        certStatus: true,
        isActive: true,
        authVersion: true,
        refreshTokenHash: true,
      },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (user.authVersion !== payload.authVersion) {
      throw new UnauthorizedException('Sessao expirada');
    }

    const validRefreshToken = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );
    if (!validRefreshToken) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    return this.issueTokenPair(user);
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
        avatarUrl: true,
        role: true,
        certStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa');
    }

    return {
      user: this.buildSafeUserResponse(user),
    };
  }

  /**
   * Atualiza ou remove a fotografia de perfil do utilizador autenticado.
   * @param userId Identificador do utilizador autenticado.
   * @param avatarUrl Nova fotografia em data URL, ou null/undefined para remover.
   * @return Perfil seguro atualizado do utilizador.
   */
  async updateAvatar(userId: number, avatarUrl: string | null | undefined) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    const normalizedAvatarUrl = this.normalizeAvatarUrl(avatarUrl ?? undefined);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: normalizedAvatarUrl },
      select: {
        id: true,
        name: true,
        biNumber: true,
        postalCode: true,
        email: true,
        avatarUrl: true,
        role: true,
        certStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      user: this.buildSafeUserResponse(user),
    };
  }

  /**
   * Invalida sessoes versionadas do utilizador autenticado.
   * @param userId Identificador do utilizador autenticado.
   * @return Mensagem de sucesso.
   */
  async logout(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        authVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
      },
    });

    return {
      message: 'Sessao terminada com sucesso',
    };
  }

  /**
   * Apaga a conta do utilizador autenticado.
   * @param userId Identificador do utilizador autenticado.
   * @return Mensagem de sucesso.
   */
  async deleteAccount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador autenticado invalido');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa');
    }

    await this.prisma.user.delete({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    return {
      message: 'Conta apagada com sucesso',
    };
  }
}
