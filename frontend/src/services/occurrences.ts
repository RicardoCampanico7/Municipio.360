/**
 * @description Normaliza ocorrencias e executa pedidos HTTP relacionados com participacoes municipais.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
/**
 * @description Representa uma ocorrencia recebida da API para areas autenticadas.
 */
export type ApiOccurrence = {
  id?: string | number;
  title?: string;
  category?: string;
  categoryKey?: OccurrenceCategoryKey;
  otherCategoryDetail?: string;
  description?: string;
  location?: string;
  status?: string;
  statusKey?: OccurrenceStatusKey;
  createdAt?: string;
  updatedAt?: string;
  imageUrls?: string[];
};

/**
 * @description Enumera as categorias validas de ocorrencias usadas pelo frontend.
 */
export type OccurrenceCategoryKey =
  | "BURACOS_PAVIMENTO"
  | "ILUMINACAO_PUBLICA"
  | "LIMPEZA_URBANA"
  | "RUIDO"
  | "ESPACOS_PUBLICOS"
  | "SINALIZACAO"
  | "OUTROS";

/**
 * @description Enumera os estados persistidos de uma ocorrencia.
 */
export type OccurrenceStatusKey = "SUBMETIDA" | "EM_TRATAMENTO" | "CONCLUIDA";

/**
 * @description Representa uma ocorrencia publica apresentada a visitantes e utilizadores.
 */
export type PublicOccurrence = {
  id?: string | number;
  category?: string;
  categoryKey?: OccurrenceCategoryKey;
  otherCategoryDetail?: string;
  description?: string;
  location?: string;
  status?: string;
  statusKey?: OccurrenceStatusKey;
  createdAt?: string;
  updatedAt?: string;
  imageUrls?: string[];
};

/**
 * @description Representa os campos editaveis de uma ocorrencia existente.
 */
export type UpdateOccurrencePayload = {
  category: OccurrenceCategoryKey;
  otherCategoryDetail?: string;
  description?: string;
  location: string;
};

/**
 * @description Representa os dados enviados ao criar uma nova ocorrencia.
 */
export type CreateOccurrencePayload = {
  category: OccurrenceCategoryKey;
  description: string;
  location: string;
  imageFiles?: File[];
};

/**
 * @description Erro normalizado para falhas nos pedidos de ocorrencias.
 */
export class OccurrencesRequestError extends Error {
  status: number;

  /**
   * Cria um erro de ocorrencias com estado HTTP associado.
   * @param message Mensagem de erro apresentada ao cliente.
   * @param status Codigo HTTP devolvido pela API.
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = "OccurrencesRequestError";
    this.status = status;
  }
}

/**
 * Normaliza uma URL de imagem associada a ocorrencia.
 * @param value Valor desconhecido recebido da API.
 * @return URL pronta a usar no cliente ou undefined quando nao existe imagem valida.
 * Pre-condicao: URLs locais em /uploads devem apontar para o proxy da API.
 */
function normalizeOccurrenceImageUrl(value: unknown) {
  const imageUrl = normalizeString(value);

  if (!imageUrl) return undefined;
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) return imageUrl;
  if (imageUrl.startsWith("/api/")) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("/uploads/")) return `/api${imageUrl}`;

  return imageUrl;
}

/**
 * Normaliza valores textuais opcionais.
 * @param value Valor desconhecido recebido da API.
 * @return String aparada ou undefined quando o valor nao e textual.
 */
function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

/**
 * Converte estados de apresentacao ou persistencia para a chave persistida.
 * @param value Estado desconhecido recebido da API.
 * @return Estado normalizado ou undefined quando nao existe correspondencia.
 * Pre-condicao: O valor pode vir como chave do backend ou alias de apresentacao.
 * Pos-condicao: Apenas estados reconhecidos sao devolvidos.
 */
function normalizeStatusKey(value: unknown): OccurrenceStatusKey | undefined {
  if (value === "SUBMETIDA" || value === "EM_TRATAMENTO" || value === "CONCLUIDA") {
    return value;
  }

  if (value === "open") return "SUBMETIDA";
  if (value === "progress") return "EM_TRATAMENTO";
  if (value === "resolved") return "CONCLUIDA";

  return undefined;
}

/**
 * Converte uma categoria desconhecida para uma categoria valida do frontend.
 * @param value Categoria desconhecida recebida da API.
 * @return Categoria normalizada ou undefined quando nao existe correspondencia.
 * Pre-condicao: O valor deve coincidir com uma das categorias suportadas.
 */
function normalizeCategoryKey(value: unknown): OccurrenceCategoryKey | undefined {
  if (
    value === "BURACOS_PAVIMENTO" ||
    value === "ILUMINACAO_PUBLICA" ||
    value === "LIMPEZA_URBANA" ||
    value === "RUIDO" ||
    value === "ESPACOS_PUBLICOS" ||
    value === "SINALIZACAO" ||
    value === "OUTROS"
  ) {
    return value;
  }

  return undefined;
}

/**
 * Normaliza o estado para a apresentacao visual no frontend.
 * @param value Estado desconhecido recebido da API.
 * @return Alias visual do estado ou string aparada quando nao existe mapeamento.
 */
function normalizePresentationStatus(value: unknown): string | undefined {
  if (value === "SUBMETIDA" || value === "open") return "open";
  if (value === "EM_TRATAMENTO" || value === "progress") return "progress";
  if (value === "CONCLUIDA" || value === "resolved") return "resolved";

  return normalizeString(value);
}

/**
 * Normaliza identificadores de ocorrencia.
 * @param value Valor desconhecido recebido da API.
 * @return Identificador textual ou numerico, ou undefined quando invalido.
 */
function normalizeId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

/**
 * Normaliza a lista de URLs de imagens de uma ocorrencia.
 * @param value Valor desconhecido que pode conter URLs de imagem.
 * @return Lista de URLs normalizadas ou undefined quando nao existem imagens validas.
 * Pre-condicao: Apenas arrays podem originar listas de imagens.
 * Pos-condicao: Entradas vazias ou invalidas sao removidas.
 */
function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const imageUrls = value
    .map((item) => normalizeOccurrenceImageUrl(item))
    .filter((item): item is string => Boolean(item));

  return imageUrls.length > 0 ? imageUrls : undefined;
}

/**
 * Sanitiza um payload desconhecido para o formato de ocorrencia usado pelo frontend.
 * @param value Payload desconhecido devolvido pela API.
 * @return Ocorrencia normalizada ou null quando o payload nao representa um objeto valido.
 * Pre-condicao: O payload pode vir parcial, aninhado ou com tipos inesperados.
 * Pos-condicao: Campos conhecidos sao normalizados antes de sair da camada de servico.
 */
function sanitizeOccurrence(value: unknown): ApiOccurrence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;

  return {
    id: normalizeId(source.id),
    title: normalizeString(source.title),
    category: normalizeString(source.category),
    categoryKey: normalizeCategoryKey(source.categoryKey ?? source.category),
    otherCategoryDetail: normalizeString(source.otherCategoryDetail),
    description: normalizeString(source.description),
    location: normalizeString(source.location),
    status: normalizePresentationStatus(source.status),
    statusKey: normalizeStatusKey(source.statusKey ?? source.status),
    createdAt: normalizeString(source.createdAt),
    updatedAt: normalizeString(source.updatedAt),
    imageUrls: normalizeImageUrls(source.imageUrls),
  };
}

/**
 * Converte uma ocorrencia interna para a forma publica.
 * @param value Ocorrencia ja sanitizada.
 * @return Ocorrencia publica com os campos permitidos para apresentacao.
 */
function toPublicOccurrence(value: ApiOccurrence): PublicOccurrence {
  return {
    id: value.id,
    category: value.category,
    categoryKey: value.categoryKey,
    otherCategoryDetail: value.otherCategoryDetail,
    description: value.description,
    location: value.location,
    status: value.status,
    statusKey: value.statusKey,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    imageUrls: value.imageUrls,
  };
}

/**
 * Normaliza respostas de lista de ocorrencias.
 * @param payload Payload desconhecido devolvido pela API.
 * @param sanitize Funcao responsavel por validar cada item da lista.
 * @return Lista de ocorrencias normalizadas e sem itens invalidos.
 * Pre-condicao: A lista pode vir diretamente ou dentro de data/occurrences.
 * Pos-condicao: O resultado e sempre um array.
 */
function normalizeOccurrencesPayload<TOccurrence>(
  payload: unknown,
  sanitize: (value: unknown) => TOccurrence | null,
): TOccurrence[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? (() => {
          const source = payload as { data?: unknown; occurrences?: unknown };
          if (Array.isArray(source.data)) return source.data;
          if (Array.isArray(source.occurrences)) return source.occurrences;
          return [];
        })()
      : [];

  return list.map(sanitize).filter((item): item is TOccurrence => item !== null);
}

/**
 * Normaliza respostas de detalhe de uma ocorrencia.
 * @param payload Payload desconhecido devolvido pela API.
 * @param sanitize Funcao responsavel por validar a ocorrencia.
 * @return Ocorrencia normalizada ou null quando a resposta nao e valida.
 * Pre-condicao: A ocorrencia pode vir diretamente ou dentro de data/occurrence.
 */
function normalizeOccurrencePayload<TOccurrence>(
  payload: unknown,
  sanitize: (value: unknown) => TOccurrence | null,
): TOccurrence | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const source = payload as { data?: unknown; occurrence?: unknown };
    if (source.data && typeof source.data === "object" && !Array.isArray(source.data)) {
      return sanitize(source.data);
    }
    if (source.occurrence && typeof source.occurrence === "object" && !Array.isArray(source.occurrence)) {
      return sanitize(source.occurrence);
    }
    return sanitize(payload);
  }

  return null;
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
 * Interpreta uma resposta HTTP com lista de ocorrencias.
 * @param response Resposta HTTP do pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @param sanitize Funcao de sanitizacao aplicada a cada item.
 * @return Promise com lista normalizada de ocorrencias.
 * Pre-condicao: A resposta deve ser JSON ou falhar de forma controlada.
 */
async function parseOccurrencesResponse<TOccurrence>(
  response: Response,
  fallbackMessage: string,
  sanitize: (value: unknown) => TOccurrence | null,
) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new OccurrencesRequestError(extractApiMessage(data) || fallbackMessage, response.status);
  }

  return normalizeOccurrencesPayload(data, sanitize);
}

/**
 * Interpreta uma resposta HTTP com detalhe de ocorrencia.
 * @param response Resposta HTTP do pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @param sanitize Funcao de sanitizacao aplicada ao payload.
 * @return Promise com ocorrencia normalizada.
 * Pre-condicao: A resposta deve conter uma ocorrencia valida.
 */
async function parseOccurrenceResponse<TOccurrence>(
  response: Response,
  fallbackMessage: string,
  sanitize: (value: unknown) => TOccurrence | null,
) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new OccurrencesRequestError(extractApiMessage(data) || fallbackMessage, response.status);
  }

  const occurrence = normalizeOccurrencePayload(data, sanitize);
  if (!occurrence) {
    throw new OccurrencesRequestError(fallbackMessage, response.status);
  }

  return occurrence;
}

/**
 * Carrega a lista publica de ocorrencias.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com ocorrencias publicas normalizadas.
 */
export async function fetchPublicOccurrences(fallbackMessage: string) {
  const response = await fetch("/api/occurrences");
  return parseOccurrencesResponse(response, fallbackMessage, (value) => {
    const occurrence = sanitizeOccurrence(value);
    return occurrence ? toPublicOccurrence(occurrence) : null;
  });
}

/**
 * Carrega as ocorrencias pertencentes ao utilizador autenticado.
 * @param token Token JWT usado para autenticar o pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com ocorrencias autenticadas normalizadas.
 * Pre-condicao: O token deve pertencer a uma sessao valida.
 */
export async function fetchMyOccurrences(token: string, fallbackMessage: string) {
  const response = await fetch("/api/occurrences/mine/list", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseOccurrencesResponse(response, fallbackMessage, sanitizeOccurrence);
}

/**
 * Carrega o detalhe publico de uma ocorrencia.
 * @param id Identificador da ocorrencia.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com ocorrencia publica normalizada.
 */
export async function fetchPublicOccurrenceById(id: string, fallbackMessage: string) {
  const response = await fetch(`/api/occurrences/${id}`);
  return parseOccurrenceResponse(response, fallbackMessage, (value) => {
    const occurrence = sanitizeOccurrence(value);
    return occurrence ? toPublicOccurrence(occurrence) : null;
  });
}

/**
 * Cria uma nova ocorrencia autenticada.
 * @param payload Dados e imagens da ocorrencia a criar.
 * @param token Token JWT usado para autenticar o pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com a ocorrencia criada e normalizada.
 * Pre-condicao: O utilizador deve estar autenticado e autorizado a criar ocorrencias.
 */
export async function createOccurrence(
  payload: CreateOccurrencePayload,
  token: string,
  fallbackMessage: string,
) {
  const formData = new FormData();
  formData.append("category", payload.category);
  formData.append("location", payload.location);
  formData.append("description", payload.description);
  payload.imageFiles?.forEach((file) => {
    formData.append("imageUrls", file, file.name);
  });

  const response = await fetch("/api/occurrences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseOccurrenceResponse(response, fallbackMessage, sanitizeOccurrence);
}

/**
 * Atualiza o estado de uma ocorrencia.
 * @param id Identificador da ocorrencia.
 * @param status Novo estado persistido.
 * @param token Token JWT usado para autenticar o pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com a resposta devolvida pelo backend.
 * Pre-condicao: O utilizador deve ter permissao de backoffice para alterar estados.
 */
export async function updateOccurrenceStatus(
  id: string,
  status: OccurrenceStatusKey,
  token: string,
  fallbackMessage: string,
) {
  const response = await fetch(`/api/occurrences/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new OccurrencesRequestError(extractApiMessage(data) || fallbackMessage, response.status);
  }

  return data;
}

/**
 * Atualiza os campos editaveis de uma ocorrencia.
 * @param id Identificador da ocorrencia.
 * @param payload Dados editaveis da ocorrencia.
 * @param token Token JWT usado para autenticar o pedido.
 * @param fallbackMessage Mensagem usada quando a API nao devolve detalhe do erro.
 * @return Promise com a resposta devolvida pelo backend.
 * Pre-condicao: O utilizador deve ser autor da ocorrencia ou ter permissao de backoffice.
 */
export async function updateOccurrence(
  id: string,
  payload: UpdateOccurrencePayload,
  token: string,
  fallbackMessage: string,
) {
  const response = await fetch(`/api/occurrences/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new OccurrencesRequestError(extractApiMessage(data) || fallbackMessage, response.status);
  }

  return data;
}
