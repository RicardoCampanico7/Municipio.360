/**
 * @description Centraliza pedidos de autenticacao e registo de utilizadores.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
import {
  clearAccessToken,
  getAuthenticatedUser,
  setAccessToken,
  setAuthenticatedUser,
  type AuthUser,
} from "./token";

/**
 * @description Representa os dados necessarios para registar um utilizador civil.
 */
export type RegisterUserPayload = {
  name: string;
  biNumber: string;
  postalCode: string;
  email: string;
  avatarUrl?: string;
  password: string;
};

type LoginResponsePayload = {
  accessToken?: unknown;
  user?: unknown;
};

/**
 * @description Erro normalizado para falhas nos pedidos de autenticacao.
 */
export class AuthRequestError extends Error {
  status: number;

  /**
   * Cria um erro de autenticacao com estado HTTP associado.
   * @param message Mensagem de erro apresentada ao cliente.
   * @param status Codigo HTTP devolvido pela API.
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
  }
}

/**
 * Normaliza um valor textual vindo da API.
 * @param value Valor desconhecido recebido no payload.
 * @return String aparada ou string vazia quando o valor nao e textual.
 */
function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Cria um nome de apresentacao a partir do email.
 * @param email Email normalizado do utilizador.
 * @return Parte local do email ou o proprio email quando nao existe parte local.
 */
function buildDisplayName(email: string): string {
  const [localPart] = email.split("@");
  return localPart?.trim() || email;
}

/**
 * Extrai o utilizador autenticado da resposta de login.
 * @param data Payload desconhecido devolvido pelo backend.
 * @return Utilizador autenticado normalizado ou null quando faltam dados obrigatorios.
 * Pre-condicao: A resposta pode vir em formato parcial e nao deve ser usada sem validacao.
 * Pos-condicao: id, nome e email existem sempre quando a funcao devolve um utilizador.
 */
function extractAuthUserFromLoginResponse(data: unknown): AuthUser | null {
  if (!data || typeof data !== "object") return null;

  const source = (data as { user?: unknown }).user;
  if (!source || typeof source !== "object") return null;

  const candidate = source as {
    id?: unknown;
    userId?: unknown;
    name?: unknown;
    fullName?: unknown;
    email?: unknown;
    avatarUrl?: unknown;
    role?: unknown;
  };

  const rawId = candidate.id ?? candidate.userId;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  const email = normalizeString(candidate.email).toLowerCase();
  const providedName = normalizeString(candidate.name ?? candidate.fullName);
  const name = providedName || (email ? buildDisplayName(email) : "");
  const avatarUrl = normalizeString(candidate.avatarUrl);
  const role = normalizeString(candidate.role).toUpperCase();

  if (!id || !name || !email) return null;
  return { id, name, email, ...(avatarUrl ? { avatarUrl } : {}), ...(role ? { role } : {}) };
}

/**
 * Extrai uma mensagem de erro normalizada da resposta da API.
 * @param data Payload desconhecido devolvido pelo backend.
 * @return Mensagem textual, lista agregada de mensagens ou string vazia.
 */
function extractApiMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(", ");
  }

  return typeof message === "string" ? message : "";
}

/**
 * Autentica um utilizador com email e password.
 * @param email Email introduzido pelo utilizador.
 * @param password Password introduzida pelo utilizador.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise resolvida quando o login e guardado localmente.
 * Pre-condicao: O email e a password devem ser enviados pelo formulario de login.
 * Pos-condicao: Um login valido guarda token e utilizador autenticado na cache local.
 */
export async function loginUser(email: string, password: string, fallbackMessage: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const data = (await response.json().catch(() => null)) as LoginResponsePayload | null;

  if (!response.ok) {
    throw new AuthRequestError(extractApiMessage(data) || fallbackMessage, response.status);
  }

  if (typeof data?.accessToken !== "string" || data.accessToken.length === 0) {
    clearAccessToken();
    throw new AuthRequestError(fallbackMessage, response.status);
  }

  setAccessToken(data.accessToken);
  const authUser = extractAuthUserFromLoginResponse(data) || getAuthenticatedUser();
  if (authUser) {
    setAuthenticatedUser(authUser);
  }
}

/**
 * Regista um novo utilizador civil.
 * @param payload Dados do utilizador a criar.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise resolvida quando o registo termina com sucesso.
 * Pre-condicao: O payload deve conter os campos obrigatorios do formulario de registo.
 */
export async function registerUser(payload: RegisterUserPayload, fallbackMessage: string) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(extractApiMessage(data) || fallbackMessage, response.status);
  }
}
