export type ApiOccurrence = {
  id?: string | number;
  title?: string;
  category?: string;
  otherCategoryDetail?: string | null;
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

function normalizeOccurrencesPayload(payload: unknown): ApiOccurrence[] {
  if (Array.isArray(payload)) {
    return payload as ApiOccurrence[];
  }

  if (payload && typeof payload === "object") {
    const source = payload as { data?: unknown; occurrences?: unknown };
    if (Array.isArray(source.data)) return source.data as ApiOccurrence[];
    if (Array.isArray(source.occurrences)) return source.occurrences as ApiOccurrence[];
  }

  return [];
}

function normalizeOccurrencePayload(payload: unknown): ApiOccurrence | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const source = payload as { data?: unknown; occurrence?: unknown };
    if (source.data && typeof source.data === "object" && !Array.isArray(source.data)) {
      return source.data as ApiOccurrence;
    }
    if (source.occurrence && typeof source.occurrence === "object" && !Array.isArray(source.occurrence)) {
      return source.occurrence as ApiOccurrence;
    }
    return payload as ApiOccurrence;
  }

  return null;
}

async function parseOccurrencesResponse(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new OccurrencesRequestError(message || fallbackMessage, response.status);
  }

  return normalizeOccurrencesPayload(data);
}

async function parseOccurrenceResponse(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new OccurrencesRequestError(message || fallbackMessage, response.status);
  }

  const occurrence = normalizeOccurrencePayload(data);
  if (!occurrence) {
    throw new OccurrencesRequestError(fallbackMessage, response.status);
  }

  return occurrence;
}

export async function fetchPublicOccurrences(fallbackMessage: string) {
  const response = await fetch("/api/occurrences");
  return parseOccurrencesResponse(response, fallbackMessage);
}

export async function fetchMyOccurrences(token: string, fallbackMessage: string) {
  const response = await fetch("/api/occurrences/mine/list", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseOccurrencesResponse(response, fallbackMessage);
}

export async function fetchPublicOccurrenceById(id: string, fallbackMessage: string) {
  const response = await fetch(`/api/occurrences/${id}`);
  return parseOccurrenceResponse(response, fallbackMessage);
}


