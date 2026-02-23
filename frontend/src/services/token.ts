const KEY = "accessToken";

export function setAccessToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}