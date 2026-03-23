import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import "./Login.css";

type RegisterRole = "CIVIL" | "OPERADOR" | "ADMINISTRADOR";

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toReadableMessage(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function extractRegisterApiErrorMessage(
  data: unknown,
  status: number,
  messages: {
    fallback: string;
    emailExists: string;
    serverError: string;
    invalidData: string;
  },
) {
  if (status === 409) {
    return messages.emailExists;
  }

  if (status >= 500) {
    return messages.serverError;
  }

  if (data && typeof data === "object") {
    const apiError = data as ApiErrorResponse;

    if (Array.isArray(apiError.message)) {
      const message = apiError.message
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map(toReadableMessage)
        .join(" ");

      if (message) return message;
    }

    if (typeof apiError.message === "string" && apiError.message.trim().length > 0) {
      const normalizedMessage = apiError.message.trim().toLowerCase();

      if (
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("already registered")
      ) {
        return messages.emailExists;
      }

      if (
        normalizedMessage !== "bad request" &&
        normalizedMessage !== "bad request exception"
      ) {
        return toReadableMessage(apiError.message);
      }
    }
  }

  if (status === 400) {
    return messages.invalidData;
  }

  return messages.fallback;
}

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showcaseImage = "/login-photo.jpg";

  const [name, setName] = useState("");
  const [citizenCard, setCitizenCard] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("CIVIL");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedName = name.trim();
    const normalizedCitizenCard = citizenCard.trim().toUpperCase();
    const normalizedPostalCode = postalCode.trim();
    const normalizedEmail = email.trim();

    if (normalizedName.length < 3) {
      setError(t("auth.registerNameMinError"));
      return;
    }

    if (!/^[0-9A-Z\s]{8,14}$/.test(normalizedCitizenCard)) {
      setError(t("auth.registerCitizenCardError"));
      return;
    }

    if (!/^\d{4}-\d{3}$/.test(normalizedPostalCode)) {
      setError(t("auth.registerPostalCodeError"));
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t("auth.registerEmailError"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.registerPasswordMinError"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          biNumber: normalizedCitizenCard,
          postalCode: normalizedPostalCode,
          email: normalizedEmail,
          password,
          role,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = extractRegisterApiErrorMessage(data, response.status, {
          fallback: t("auth.registerError"),
          emailExists: t("auth.registerErrorEmailExists"),
          serverError: t("auth.registerErrorServer"),
          invalidData: t("auth.registerErrorInvalidData"),
        });
        throw new Error(msg || "REGISTER_FAILED");
      }

      navigate("/login");
    } catch (registerError) {
      if (registerError instanceof Error) {
        if (registerError.message.toLowerCase().includes("failed to fetch")) {
          setError(t("auth.registerErrorNetwork"));
        } else {
          setError(registerError.message || t("auth.registerError"));
        }
      } else {
        setError(t("auth.registerError"));
      }
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <main className="auth-screen">
      <section className="auth-shell" aria-label={t("auth.registerButton")}>
        <aside className="auth-showcase" aria-hidden="true">
          <div className="showcase-panel">
            <div className="showcase-illustration">
              <img className="showcase-photo" src={showcaseImage} alt="Vista da cidade" />
            </div>
          </div>
        </aside>

        <div className="auth-card">
          <div className="brand brand-stack">
            <AppLogo className="brand-logo" />
            <div className="brand-name">{t("appName")}</div>
          </div>

          <h1 className="auth-title">{t("auth.registerTitle")}</h1>
          <p className="auth-subtitle">{t("auth.registerSubtitle")}</p>

          <form className="auth-form" onSubmit={handleRegister}>
            <label className="sr-only" htmlFor="register-name">
              {t("auth.name")}
            </label>
            <input
              id="register-name"
              className="auth-input"
              type="text"
              placeholder={t("auth.namePlaceholder")}
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              minLength={3}
              required
            />

            <label className="sr-only" htmlFor="register-citizen-card">
              {t("auth.citizenCard")}
            </label>
            <input
              id="register-citizen-card"
              className="auth-input"
              type="text"
              placeholder={t("auth.citizenCardPlaceholder")}
              autoComplete="off"
              value={citizenCard}
              onChange={(e) => {
                setCitizenCard(e.target.value.toUpperCase());
                if (error) setError("");
              }}
              required
            />

            <label className="sr-only" htmlFor="register-postal-code">
              {t("auth.postalCode")}
            </label>
            <input
              id="register-postal-code"
              className="auth-input"
              type="text"
              placeholder={t("auth.postalCodePlaceholder")}
              autoComplete="postal-code"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                if (error) setError("");
              }}
              inputMode="numeric"
              required
            />

            <label className="sr-only" htmlFor="register-email">
              {t("auth.email")}
            </label>
            <input
              id="register-email"
              className="auth-input"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              required
            />

            <label className="sr-only" htmlFor="register-role">
              {t("profile.metrics.role")}
            </label>
            <select
              id="register-role"
              className="auth-input"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as RegisterRole);
                if (error) setError("");
              }}
            >
              <option value="CIVIL">{t("profile.roles.civil")}</option>
              <option value="OPERADOR">{t("profile.roles.operador")}</option>
              <option value="ADMINISTRADOR">{t("profile.roles.administrador")}</option>
            </select>

            <div className="password-wrap">
              <label className="sr-only" htmlFor="register-password">
                {t("auth.password")}
              </label>
              <input
                id="register-password"
                className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder={t("auth.password")}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                minLength={8}
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

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? t("auth.registerLoading") : t("auth.registerButton")}
            </button>
          </form>

          <p className="auth-footer">
            {t("auth.hasAccount")}{" "}
            <Link className="auth-link strong" to="/login">
              {t("auth.loginLink")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
