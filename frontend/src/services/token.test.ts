import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccessToken,
  clearAuthenticatedUser,
  getAccessSession,
  getAccessToken,
  getAuthenticatedUser,
  getRawAccessToken,
  isAuthenticated,
  isBackofficeRole,
  isTokenExpired,
  setAccessToken,
  setAuthenticatedUser,
} from "./token";

const ACCESS_TOKEN_KEY = "accessToken";
const AUTH_USER_KEY = "authUser";

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
  } satisfies Storage;
}

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("token service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:00:00.000Z"));
    vi.stubGlobal("localStorage", createLocalStorageMock());
    vi.stubGlobal("atob", (value: string) => Buffer.from(value, "base64").toString("binary"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("stores and reads the raw access token", () => {
    const token = createJwt({ exp: 1_779_018_400 });

    setAccessToken(token);

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(token);
    expect(getRawAccessToken()).toBe(token);
  });

  it("detects valid, expired, malformed, and missing-expiration tokens", () => {
    expect(isTokenExpired(createJwt({ exp: 1_779_018_400 }))).toBe(false);
    expect(isTokenExpired(createJwt({ exp: 1_778_932_799 }))).toBe(true);
    expect(isTokenExpired("not-a-jwt")).toBe(true);
    expect(isTokenExpired(createJwt({ sub: 1 }))).toBe(true);
  });

  it("returns a valid access token and clears an expired one", () => {
    const validToken = createJwt({ exp: 1_779_018_400, sub: 1 });
    setAccessToken(validToken);

    expect(getAccessToken()).toBe(validToken);

    setAuthenticatedUser({ id: "1", name: "Rita", email: "rita@example.test" });
    setAccessToken(createJwt({ exp: 1_778_932_799, sub: 1 }));

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it("reports whether a stored session existed before token validation", () => {
    expect(getAccessSession()).toEqual({ token: null, hadStoredSession: false });

    setAccessToken(createJwt({ exp: 1_778_932_799, sub: 1 }));

    expect(getAccessSession()).toEqual({ token: null, hadStoredSession: true });
  });

  it("clears the access token and cached authenticated user together", () => {
    setAccessToken(createJwt({ exp: 1_779_018_400, sub: 1 }));
    setAuthenticatedUser({ id: "1", name: "Rita", email: "rita@example.test" });

    clearAccessToken();

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it("stores and clears an authenticated user", () => {
    setAuthenticatedUser({
      id: "7",
      name: "Maria",
      email: "maria@example.test",
      avatarUrl: "data:image/png;base64,abc",
      role: "OPERADOR",
    });

    expect(JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}")).toMatchObject({
      id: "7",
      name: "Maria",
      email: "maria@example.test",
      avatarUrl: "data:image/png;base64,abc",
      role: "OPERADOR",
    });

    clearAuthenticatedUser();

    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it("sanitizes a cached authenticated user from localStorage", () => {
    localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify({
        id: " 42 ",
        name: " Ana Silva ",
        email: " ANA@EXAMPLE.TEST ",
        avatarUrl: " /avatar.png ",
        role: " operador ",
      }),
    );

    expect(getAuthenticatedUser()).toEqual({
      id: "42",
      name: "Ana Silva",
      email: "ana@example.test",
      avatarUrl: "/avatar.png",
      role: "OPERADOR",
    });
  });

  it("rejects malformed or incomplete cached users", () => {
    localStorage.setItem(AUTH_USER_KEY, "{bad json");
    expect(getAuthenticatedUser()).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ name: "No ID", email: "a@b.test" }));
    expect(getAuthenticatedUser()).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: "1", name: "No Email" }));
    expect(getAuthenticatedUser()).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it("builds and caches an authenticated user from a valid token", () => {
    setAccessToken(
      createJwt({
        exp: 1_779_018_400,
        sub: 9,
        fullName: "Joao Sousa",
        email: "JOAO@EXAMPLE.TEST",
        avatarUrl: " /joao.png ",
        role: "administrador",
      }),
    );

    expect(getAuthenticatedUser()).toEqual({
      id: "9",
      name: "Joao Sousa",
      email: "joao@example.test",
      avatarUrl: "/joao.png",
      role: "ADMINISTRADOR",
    });
    expect(JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}")).toMatchObject({
      id: "9",
      email: "joao@example.test",
    });
  });

  it("uses the email local part as a fallback token display name", () => {
    setAccessToken(createJwt({ exp: 1_779_018_400, userId: "11", email: "cidadao@example.test" }));

    expect(getAuthenticatedUser()).toMatchObject({
      id: "11",
      name: "cidadao",
      email: "cidadao@example.test",
    });
  });

  it("returns null when no cached user or usable token exists", () => {
    expect(getAuthenticatedUser()).toBeNull();

    setAccessToken("malformed.token.value");

    expect(getAuthenticatedUser()).toBeNull();
    expect(getRawAccessToken()).toBeNull();
  });

  it("reports authentication state from the access token", () => {
    expect(isAuthenticated()).toBe(false);

    setAccessToken(createJwt({ exp: 1_779_018_400, sub: 1 }));
    expect(isAuthenticated()).toBe(true);

    setAccessToken(createJwt({ exp: 1_778_932_799, sub: 1 }));
    expect(isAuthenticated()).toBe(false);
  });

  it("recognizes only exact backoffice roles", () => {
    expect(isBackofficeRole("OPERADOR")).toBe(true);
    expect(isBackofficeRole("ADMINISTRADOR")).toBe(true);
    expect(isBackofficeRole("CIVIL")).toBe(false);
    expect(isBackofficeRole("operador")).toBe(false);
    expect(isBackofficeRole(undefined)).toBe(false);
    expect(isBackofficeRole(null)).toBe(false);
  });
});
