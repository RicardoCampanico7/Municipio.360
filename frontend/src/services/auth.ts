import {
  clearAccessToken,
  getAuthenticatedUser,
  setAccessToken,
  setAuthenticatedUser,
  type AuthUser,
} from "./token";

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

export class AuthRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
  }
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildDisplayName(email: string): string {
  const [localPart] = email.split("@");
  return localPart?.trim() || email;
}

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

function extractApiMessage(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(", ");
  }

  return typeof message === "string" ? message : "";
}

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
