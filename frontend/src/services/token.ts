/**
 * @description Gere tokens de acesso, sessao autenticada e roles do utilizador no cliente.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
const ACCESS_TOKEN_KEY = "accessToken";
const AUTH_USER_KEY = "authUser";

type JwtPayload = {
  exp?: number;
  sub?: string | number;
  id?: string | number;
  userId?: string | number;
  name?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
};

/**
 * @description Representa os dados seguros do utilizador autenticado guardados no cliente.
 */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
};

/**
 * Guarda o token JWT de acesso no armazenamento local.
 * @param token Token JWT emitido pelo backend.
 * @return void
 */
export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

/**
 * Extrai o payload JSON de um token JWT.
 * @param token Token JWT em formato compacto.
 * @return Payload descodificado ou null quando o token e invalido.
 * Pre-condicao: O token deve ser uma string JWT com tres segmentos.
 * Pos-condicao: Tokens malformados nao propagam excecoes para o chamador.
 */
function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Obtem a expiracao de um token em milissegundos.
 * @param token Token JWT a validar.
 * @return Timestamp de expiracao em milissegundos ou null quando nao existe expiracao valida.
 * Pre-condicao: O token deve conter um payload JSON descodificavel.
 */
function getTokenExpirationInMs(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== "number") {
    return null;
  }

  return payload.exp * 1000;
}

/**
 * Verifica se um token esta expirado ou nao pode ser usado.
 * @param token Token JWT a avaliar.
 * @return true quando o token expirou, esta malformado ou nao tem expiracao valida.
 * Pre-condicao: O token deve ser uma string JWT valida para ser considerado ativo.
 * Pos-condicao: Tokens sem expiracao sao tratados como expirados.
 */
export function isTokenExpired(token: string): boolean {
  const expiresAt = getTokenExpirationInMs(token);
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}

/**
 * Remove o token de acesso e os dados autenticados em cache.
 * @return void
 * Pos-condicao: A sessao local deixa de ter credenciais reutilizaveis.
 */
export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  clearAuthenticatedUser();
}

/**
 * Devolve o token de acesso valido guardado localmente.
 * @return Token JWT valido ou null quando nao existe token utilizavel.
 * Pre-condicao: O token guardado deve estar no localStorage sob a chave de acesso.
 * Pos-condicao: Tokens expirados sao removidos juntamente com a cache do utilizador.
 */
export function getAccessToken(): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAccessToken();
    return null;
  }

  return token;
}

/**
 * Le o token de acesso sem validar expiracao.
 * @return Token bruto guardado localmente ou null quando nao existe.
 */
export function getRawAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Obtem o estado atual da sessao de acesso.
 * @return Objeto com token valido e indicador de sessao previamente guardada.
 * Pos-condicao: Um token expirado pode ser removido durante esta leitura.
 */
export function getAccessSession() {
  const hadStoredSession = !!getRawAccessToken();
  const token = getAccessToken();

  return { token, hadStoredSession };
}

/**
 * Normaliza valores textuais vindos de fontes desconhecidas.
 * @param value Valor recebido do armazenamento local ou payload JWT.
 * @return String aparada ou string vazia quando o valor nao e textual.
 */
function normalizeStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Constroi um nome visivel a partir do email.
 * @param email Email normalizado do utilizador.
 * @return Parte local do email ou o proprio email quando nao existe parte local.
 */
function buildDisplayName(email: string): string {
  const [localPart] = email.split("@");
  return localPart?.trim() || email;
}

/**
 * Sanitiza um objeto desconhecido para o formato de utilizador autenticado.
 * @param value Valor desconhecido lido da cache local.
 * @return Utilizador autenticado normalizado ou null quando faltam campos obrigatorios.
 * Pre-condicao: O valor pode vir de JSON persistido e nao deve ser confiado diretamente.
 * Pos-condicao: id, nome e email existem sempre quando a funcao devolve um utilizador.
 */
function sanitizeAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<AuthUser>;
  const id = normalizeStringValue(candidate.id);
  const email = normalizeStringValue(candidate.email).toLowerCase();
  const name = normalizeStringValue(candidate.name) || (email ? buildDisplayName(email) : "");
  const avatarUrl = normalizeStringValue(candidate.avatarUrl);
  const role = normalizeStringValue(candidate.role).toUpperCase();

  if (!id || !name || !email) return null;
  return {
    id,
    name,
    email,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(role ? { role } : {}),
  };
}

/**
 * Constroi um utilizador autenticado a partir do payload do token.
 * @param token Token JWT guardado localmente.
 * @return Utilizador autenticado normalizado ou null quando o token nao tem dados suficientes.
 * Pre-condicao: O token deve conter identificador, email e opcionalmente nome/role.
 */
function buildAuthUserFromToken(token: string): AuthUser | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const rawId = payload.sub ?? payload.userId ?? payload.id;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  const email = normalizeStringValue(payload.email).toLowerCase();
  const name =
    normalizeStringValue(payload.name || payload.fullName) ||
    (email ? buildDisplayName(email) : "");
  const avatarUrl = normalizeStringValue(payload.avatarUrl);
  const role = normalizeStringValue(payload.role).toUpperCase();

  if (!id || !name || !email) return null;
  return {
    id,
    name,
    email,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(role ? { role } : {}),
  };
}

/**
 * Guarda os dados seguros do utilizador autenticado no armazenamento local.
 * @param user Utilizador autenticado ja normalizado.
 * @return void
 */
export function setAuthenticatedUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Remove os dados do utilizador autenticado guardados em cache.
 * @return void
 */
export function clearAuthenticatedUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Obtem o utilizador autenticado a partir da cache ou do token atual.
 * @return Utilizador autenticado normalizado ou null quando nao existe sessao valida.
 * Pre-condicao: A cache local pode conter JSON invalido ou dados incompletos.
 * Pos-condicao: Dados de utilizador invalidos sao removidos da cache.
 */
export function getAuthenticatedUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const sanitized = sanitizeAuthUser(parsed);
      if (sanitized) return sanitized;
      clearAuthenticatedUser();
    } catch {
      clearAuthenticatedUser();
    }
  }

  const token = getAccessToken();
  if (!token) {
    clearAuthenticatedUser();
    return null;
  }

  const fromToken = buildAuthUserFromToken(token);
  if (fromToken) {
    setAuthenticatedUser(fromToken);
    return fromToken;
  }

  return null;
}

/**
 * Indica se existe uma sessao autenticada valida.
 * @return true quando existe token de acesso valido; caso contrario false.
 * Pos-condicao: Tokens expirados podem ser limpos durante a validacao.
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Verifica se uma role pertence ao backoffice.
 * @param role Role do utilizador autenticado.
 * @return true para OPERADOR ou ADMINISTRADOR; false para restantes valores.
 * Pre-condicao: A role deve estar normalizada em maiusculas para corresponder.
 */
export function isBackofficeRole(role: string | undefined | null): boolean {
  return role === "OPERADOR" || role === "ADMINISTRADOR";
}
