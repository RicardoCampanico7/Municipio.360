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
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

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

function getTokenExpirationInMs(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== "number") {
    return null;
  }

  return payload.exp * 1000;
}

export function isTokenExpired(token: string): boolean {
  const expiresAt = getTokenExpirationInMs(token);
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  clearAuthenticatedUser();
}

export function getAccessToken(): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAccessToken();
    return null;
  }

  return token;
}

export function getRawAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function normalizeStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildDisplayName(email: string): string {
  const [localPart] = email.split("@");
  return localPart?.trim() || email;
}

function sanitizeAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<AuthUser>;
  const id = normalizeStringValue(candidate.id);
  const email = normalizeStringValue(candidate.email).toLowerCase();
  const name = normalizeStringValue(candidate.name) || (email ? buildDisplayName(email) : "");

  if (!id || !name || !email) return null;
  return { id, name, email };
}

function buildAuthUserFromToken(token: string): AuthUser | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const rawId = payload.sub ?? payload.userId ?? payload.id;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  const email = normalizeStringValue(payload.email).toLowerCase();
  const name =
    normalizeStringValue(payload.name || payload.fullName) ||
    (email ? buildDisplayName(email) : "");

  if (!id || !name || !email) return null;
  return { id, name, email };
}

export function setAuthenticatedUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthenticatedUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

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

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
