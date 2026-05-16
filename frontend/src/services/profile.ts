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

export type UpdateProfilePayload = {
  name: string;
  email: string;
  biNumber: string;
  postalCode: string;
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

function extractProfileMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(", ");
  }

  return typeof message === "string" ? message : "";
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
    throw new ProfileRequestError(extractProfileMessage(data) || fallbackMessage, response.status);
  }

  const profile = normalizeProfilePayload(data);

  if (!profile) {
    throw new ProfileRequestError(fallbackMessage, response.status);
  }

  return profile;
}

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
