const KEY = "accessToken";

export function setAccessToken(token: string) {
  localStorage.setItem(KEY, token);
}

function parseJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
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
  localStorage.removeItem(KEY);
}

export function getAccessToken(): string | null {
  const token = localStorage.getItem(KEY);
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAccessToken();
    return null;
  }

  return token;
}

export function getRawAccessToken(): string | null {
  return localStorage.getItem(KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
