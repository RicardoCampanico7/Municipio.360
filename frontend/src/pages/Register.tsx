import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import { AuthRequestError, registerUser } from "../services/auth";
import "./Login.css";

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("AVATAR_READ_FAILED"));
    };
    reader.onerror = () => reject(new Error("AVATAR_READ_FAILED"));
    reader.readAsDataURL(file);
  });
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024;

  const [name, setName] = useState("");
  const [citizenCard, setCitizenCard] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAvatarSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("auth.registerAvatarTypeError"));
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError(t("auth.registerAvatarSizeError"));
      return;
    }

    try {
      const nextAvatarUrl = await readFileAsDataUrl(file);
      setAvatarUrl(nextAvatarUrl);
      if (error) setError("");
    } catch {
      setError(t("auth.registerAvatarReadError"));
    }
  };

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
      await registerUser(
        {
          name: normalizedName,
          biNumber: normalizedCitizenCard,
          postalCode: normalizedPostalCode,
          email: normalizedEmail,
          avatarUrl: avatarUrl || undefined,
          password,
        },
        t("auth.registerError"),
      );

      navigate("/login");
    } catch (registerError) {
      if (registerError instanceof AuthRequestError) {
        setError(
          extractRegisterApiErrorMessage(
            { message: registerError.message },
            registerError.status,
            {
              fallback: t("auth.registerError"),
              emailExists: t("auth.registerErrorEmailExists"),
              serverError: t("auth.registerErrorServer"),
              invalidData: t("auth.registerErrorInvalidData"),
            },
          ),
        );
        return;
      }

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

            <div className="auth-avatar-field">
              <div className="auth-avatar-head">
                <span className="auth-avatar-label">{t("auth.registerAvatarLabel")}</span>
                <button
                  className="auth-avatar-action"
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={loading}
                >
                  {avatarUrl ? t("auth.registerAvatarChange") : t("auth.registerAvatarButton")}
                </button>
              </div>

              <input
                ref={avatarInputRef}
                className="auth-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarSelection}
                disabled={loading}
              />

              <div className="auth-avatar-card">
                <div className="auth-avatar-preview">
                  {avatarUrl ? (
                    <img
                      className="auth-avatar-preview-image"
                      src={avatarUrl}
                      alt={t("auth.registerAvatarPreviewAlt")}
                    />
                  ) : (
                    <span>{name.trim().charAt(0).toUpperCase() || "U"}</span>
                  )}
                </div>

                <div className="auth-avatar-copy">
                  <strong>{t("auth.registerAvatarTitle")}</strong>
                  <span>{t("auth.registerAvatarHint")}</span>
                </div>

                {avatarUrl && (
                  <button
                    className="auth-avatar-remove"
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    disabled={loading}
                  >
                    {t("auth.registerAvatarRemove")}
                  </button>
                )}
              </div>
            </div>

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
