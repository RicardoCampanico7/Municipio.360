export type ApiProfileUser = {
  id?: string | number;
  name?: string;
  biNumber?: string;
  postalCode?: string;
  email?: string;
  role?: string;
  certStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

export class ProfileRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProfileRequestError";
    this.status = status;
  }
}

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

export async function fetchAuthenticatedProfile(token: string, fallbackMessage: string) {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new ProfileRequestError(message || fallbackMessage, response.status);
  }

  const profile = normalizeProfilePayload(data);

  if (!profile) {
    throw new ProfileRequestError(fallbackMessage, response.status);
  }

  return profile;
}
