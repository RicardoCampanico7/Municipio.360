import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  clearAccessToken,
  getAuthenticatedUser,
  setAccessToken,
  setAuthenticatedUser,
  type AuthUser,
} from "../services/token";
import "./Login.css";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
  };

  const rawId = candidate.id ?? candidate.userId;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  const name = normalizeString(candidate.name ?? candidate.fullName);
  const email = normalizeString(candidate.email).toLowerCase();

  if (!id || !name || !email) return null;
  return { id, name, email };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const showcaseImage = "/login-photo.jpg";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state && (location.state as { sessionExpired?: boolean }).sessionExpired) {
      setError(t("auth.sessionExpired"));
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        throw new Error(msg || "LOGIN_FAILED");
      }

      if (typeof data?.accessToken !== "string" || data.accessToken.length === 0) {
        clearAccessToken();
        throw new Error("LOGIN_TOKEN_MISSING");
      }

      setAccessToken(data.accessToken);
      const authUser = extractAuthUserFromLoginResponse(data) || getAuthenticatedUser();
      if (authUser) {
        setAuthenticatedUser(authUser);
      }
      navigate("/dashboard");
    } catch {
      setError(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-shell" aria-label={t("auth.loginButton")}>
        <aside className="auth-showcase" aria-hidden="true">
          <div className="showcase-panel">
            <div className="showcase-illustration">
              <img
                className="showcase-photo"
                src={showcaseImage}
                alt="Equipa municipal em atendimento"
              />
            </div>
          </div>
        </aside>

        <div className="auth-card">
          <div className="brand brand-stack">
            <AppLogo className="brand-logo" />
            <div className="brand-name">{t("appName")}</div>
          </div>

          <h1 className="auth-title">{t("auth.loginTitle")}</h1>
          <p className="auth-subtitle">{t("auth.loginSubtitle")}</p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="sr-only" htmlFor="email">
              {t("auth.email")}
            </label>
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="password-wrap">
              <label className="sr-only" htmlFor="password">
                {t("auth.password")}
              </label>
              <input
                id="password"
                className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder={t("auth.password")}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                title={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPass ? t("auth.hidePassword") : t("auth.showPassword")}
              </button>
            </div>

            <div className="auth-row">
              <Link className="auth-link" to="/forgot-password">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? t("auth.loginLoading") : t("auth.loginButton")}
            </button>
          </form>

          <p className="auth-footer">
            {t("auth.noAccount")}{" "}
            <Link className="auth-link strong" to="/register">
              {t("auth.signup")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
