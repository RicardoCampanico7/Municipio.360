/**
 * @description Carrega e atualiza os dados do perfil autenticado.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
/**
 * @description Representa os dados de perfil devolvidos pela API.
 */
export type ApiProfileUser = {
  id?: string | number;
  name?: string;
  biNumber?: string;
  postalCode?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * @description Representa os campos editaveis do perfil autenticado.
 */
export type UpdateProfilePayload = {
  name: string;
  email: string;
  biNumber: string;
  postalCode: string;
};

/**
 * @description Erro normalizado para falhas nos pedidos de perfil.
 */
export class ProfileRequestError extends Error {
  status: number;

  /**
   * Cria um erro de perfil com estado HTTP associado.
   * @param message Mensagem de erro apresentada ao cliente.
   * @param status Codigo HTTP devolvido pela API.
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = "ProfileRequestError";
    this.status = status;
  }
}

/**
 * Normaliza um payload desconhecido para o formato de perfil.
 * @param payload Payload desconhecido devolvido pela API.
 * @return Perfil normalizado ou null quando o payload nao e valido.
 * Pre-condicao: O perfil pode vir diretamente ou dentro de user/data.
 */
function normalizeProfilePayload(payload: unknown): ApiProfileUser | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const source = payload as { user?: unknown; data?: unknown };

  if (source.user && typeof source.user === "object" && !Array.isArray(source.user)) {
    return source.user as ApiProfileUser;
  }

  if (source.data && typeof source.data === "object" && !Array.isArray(source.data)) {
    return source.data as ApiProfileUser;
  }

  return payload as ApiProfileUser;
}

/**
 * Extrai uma mensagem de erro normalizada da resposta de perfil.
 * @param data Payload desconhecido devolvido pelo backend.
 * @return Mensagem textual, lista agregada de mensagens ou string vazia.
 */
function extractProfileMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(", ");
  }

  return typeof message === "string" ? message : "";
}

/**
 * Carrega o perfil do utilizador autenticado.
 * @param token Token JWT usado para autenticar o pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com perfil normalizado.
 * Pre-condicao: O token deve pertencer a uma sessao valida.
 */
export async function fetchAuthenticatedProfile(token: string, fallbackMessage: string) {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ProfileRequestError(extractProfileMessage(data) || fallbackMessage, response.status);
  }

  const profile = normalizeProfilePayload(data);

  if (!profile) {
    throw new ProfileRequestError(fallbackMessage, response.status);
  }

  return profile;
}

/**
 * Atualiza os campos editaveis do perfil autenticado.
 * @param token Token JWT usado para autenticar o pedido.
 * @param payload Dados editaveis do perfil.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com perfil atualizado e normalizado.
 * Pre-condicao: O payload deve conter os campos obrigatorios do formulario de perfil.
 */
export async function updateAuthenticatedProfile(
  token: string,
  payload: UpdateProfilePayload,
  fallbackMessage: string,
) {
  const response = await fetch("/api/auth/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ProfileRequestError(extractProfileMessage(data) || fallbackMessage, response.status);
  }

  const profile = normalizeProfilePayload(data);

  if (!profile) {
    throw new ProfileRequestError(fallbackMessage, response.status);
  }

  return profile;
}
