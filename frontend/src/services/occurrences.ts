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

async function parseOccurrencesResponse(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new OccurrencesRequestError(message || fallbackMessage, response.status);
  }

  return normalizeOccurrencesPayload(data);
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
