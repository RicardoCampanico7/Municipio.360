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

export type OccurrenceCategoryKey =
  | "BURACOS_PAVIMENTO"
  | "ILUMINACAO_PUBLICA"
  | "LIMPEZA_URBANA"
  | "RUIDO"
  | "ESPACOS_PUBLICOS"
  | "SINALIZACAO"
  | "OUTROS";

export type OccurrenceStatusKey = "SUBMETIDA" | "EM_TRATAMENTO" | "CONCLUIDA";

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

export type UpdateOccurrencePayload = {
  category: OccurrenceCategoryKey;
  otherCategoryDetail?: string;
  description?: string;
  location: string;
};

export type CreateOccurrencePayload = {
  category: OccurrenceCategoryKey;
  description: string;
  location: string;
  imageFiles?: File[];
};

export class OccurrencesRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OccurrencesRequestError";
    this.status = status;
  }
}

function normalizeOccurrenceImageUrl(value: unknown) {
  const imageUrl = normalizeString(value);

  if (!imageUrl) return undefined;
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) return imageUrl;
  if (imageUrl.startsWith("/api/")) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("/uploads/")) return `/api${imageUrl}`;

  return imageUrl;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeStatusKey(value: unknown): OccurrenceStatusKey | undefined {
  if (value === "SUBMETIDA" || value === "EM_TRATAMENTO" || value === "CONCLUIDA") {
    return value;
  }

  if (value === "open") return "SUBMETIDA";
  if (value === "progress") return "EM_TRATAMENTO";
  if (value === "resolved") return "CONCLUIDA";

  return undefined;
}

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

function normalizePresentationStatus(value: unknown): string | undefined {
  if (value === "SUBMETIDA" || value === "open") return "open";
  if (value === "EM_TRATAMENTO" || value === "progress") return "progress";
  if (value === "CONCLUIDA" || value === "resolved") return "resolved";

  return normalizeString(value);
}

function normalizeId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const imageUrls = value
    .map((item) => normalizeOccurrenceImageUrl(item))
    .filter((item): item is string => Boolean(item));

  return imageUrls.length > 0 ? imageUrls : undefined;
}

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

function extractApiMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(", ");
  }

  return typeof message === "string" ? message : "";
}

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

export async function fetchPublicOccurrences(fallbackMessage: string) {
  const response = await fetch("/api/occurrences");
  return parseOccurrencesResponse(response, fallbackMessage, (value) => {
    const occurrence = sanitizeOccurrence(value);
    return occurrence ? toPublicOccurrence(occurrence) : null;
  });
}

export async function fetchMyOccurrences(token: string, fallbackMessage: string) {
  const response = await fetch("/api/occurrences/mine/list", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseOccurrencesResponse(response, fallbackMessage, sanitizeOccurrence);
}

export async function fetchPublicOccurrenceById(id: string, fallbackMessage: string) {
  const response = await fetch(`/api/occurrences/${id}`);
  return parseOccurrenceResponse(response, fallbackMessage, (value) => {
    const occurrence = sanitizeOccurrence(value);
    return occurrence ? toPublicOccurrence(occurrence) : null;
  });
}

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
