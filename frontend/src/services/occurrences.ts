export type ApiOccurrence = {
  id?: string | number;
  title?: string;
  category?: string;
  description?: string;
  location?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrls?: string[];
};

export type PublicOccurrence = {
  id?: string | number;
  category?: string;
  description?: string;
  location?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrls?: string[];
};

export class OccurrencesRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OccurrencesRequestError";
    this.status = status;
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const imageUrls = value
    .map((item) => normalizeString(item))
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
    description: normalizeString(source.description),
    location: normalizeString(source.location),
    status: normalizeString(source.status),
    createdAt: normalizeString(source.createdAt),
    updatedAt: normalizeString(source.updatedAt),
    imageUrls: normalizeImageUrls(source.imageUrls),
  };
}

function toPublicOccurrence(value: ApiOccurrence): PublicOccurrence {
  return {
    id: value.id,
    category: value.category,
    description: value.description,
    location: value.location,
    status: value.status,
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

async function parseOccurrencesResponse<TOccurrence>(
  response: Response,
  fallbackMessage: string,
  sanitize: (value: unknown) => TOccurrence | null,
) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new OccurrencesRequestError(message || fallbackMessage, response.status);
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
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new OccurrencesRequestError(message || fallbackMessage, response.status);
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
