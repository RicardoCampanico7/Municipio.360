import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showcaseImage = "/login-photo.jpg";

  const [name, setName] = useState("");
  const [citizenCard, setCitizenCard] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("REGISTER_FAILED");
      }

      navigate("/login");
    } catch {
      setError(t("auth.registerError"));
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
          <div className="brand">
            <div className="brand-badge" aria-hidden="true">
              M
            </div>
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setCitizenCard(e.target.value.toUpperCase())}
              minLength={8}
              maxLength={14}
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
              inputMode="numeric"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              pattern="[0-9]{4}-[0-9]{3}"
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
              onChange={(e) => setEmail(e.target.value)}
              required
            />

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
