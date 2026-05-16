import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import OccurrenceCard from "../components/OccurrenceCard";
import {
  OccurrencesRequestError,
  fetchPublicOccurrences,
  fetchMyOccurrences,
  type ApiOccurrence,
} from "../services/occurrences";
import {
  ProfileRequestError,
  fetchAuthenticatedProfile,
  type ApiProfileUser,
} from "../services/profile";
import {
  clearAccessToken,
  getAccessSession,
  getAuthenticatedUser,
  isAuthenticated,
  setAuthenticatedUser,
  type AuthUser,
} from "../services/token";
import "./Dashboard.css";

const languageOptions = [
  { code: "pt", flag: "🇵🇹" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
] as const;

const dashboardBannerSlides = [
  { src: "/dashboard-banner.png", alt: "Vista urbana do municipio" },
  { src: "/login-photo.jpg", alt: "Paisagem da cidade" },
  { src: "/ocurrence-all-photo.jpg", alt: "Vista geral do municipio" },
  { src: "/ocurrence-mapa.jpg", alt: "Mapa do municipio" },
  { src: "/ocuurence-public.jpg", alt: "Ocorrencias publicas do municipio" },
] as const;

type ReportTone = "progress" | "open" | "done";

type DashboardReport = {
  id: string;
  occurrenceId?: string;
  status: string;
  title: string;
  time: string;
  tone: ReportTone;
};

function toTimeLabel(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale || "pt-PT");
}

function normalizeProfileForSession(profile: ApiProfileUser): AuthUser | null {
  const id = profile.id !== undefined && profile.id !== null ? String(profile.id).trim() : "";
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const avatarUrl = typeof profile.avatarUrl === "string" ? profile.avatarUrl.trim() : "";
  const role = typeof profile.role === "string" ? profile.role.trim().toUpperCase() : "";

  if (!id || !name || !email) return null;
  return { id, name, email, ...(avatarUrl ? { avatarUrl } : {}), ...(role ? { role } : {}) };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const authenticated = isAuthenticated();
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(() => getAuthenticatedUser());
  const userName = authenticated ? sessionUser?.name || t("dashboard.defaultUserName") : t("dashboard.publicGreetingName");
  const userAvatar = authenticated ? sessionUser?.avatarUrl || "" : "";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "V";
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [occurrences, setOccurrences] = useState<ApiOccurrence[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");

  const redirectToLogin = (from: string) => {
    clearAccessToken();
    navigate("/login", { replace: true, state: { from } });
  };

  useEffect(() => {
    const { token, hadStoredSession } = getAccessSession();

    let mounted = true;
    const loadCurrentUser = async () => {
      if (!token) {
        setSessionUser(null);
        return;
      }

      const cachedUser = getAuthenticatedUser();
      if (mounted) {
        setSessionUser(cachedUser);
      }

      try {
        const profile = await fetchAuthenticatedProfile(token, "Nao foi possivel carregar o perfil.");
        if (!mounted) return;

        const nextUser = normalizeProfileForSession(profile);
        if (nextUser) {
          setAuthenticatedUser(nextUser);
          setSessionUser(nextUser);
        }
      } catch (error) {
        if (!mounted) return;
        if (error instanceof ProfileRequestError && error.status === 401) {
          clearAccessToken();
          navigate("/login", {
            replace: true,
            state: { from: "/dashboard", ...(hadStoredSession ? { sessionExpired: true } : {}) },
          });
        }
      }
    };

    const loadOccurrences = async () => {
      setReportsLoading(true);
      setReportsError("");

      try {
        const data = token
          ? await fetchMyOccurrences(token, t("dashboard.reportsLoadError"))
          : await fetchPublicOccurrences(t("dashboard.publicReportsLoadError"));
        if (!mounted) return;
        setOccurrences(data);
      } catch (error) {
        if (!mounted) return;
        if (error instanceof OccurrencesRequestError && error.status === 401) {
          clearAccessToken();
          navigate("/login", {
            replace: true,
            state: { from: "/dashboard", ...(hadStoredSession ? { sessionExpired: true } : {}) },
          });
          return;
        }
        setReportsError(token ? t("dashboard.reportsLoadError") : t("dashboard.publicReportsLoadError"));
      } finally {
        if (!mounted) return;
        setReportsLoading(false);
      }
    };

    void loadCurrentUser();
    void loadOccurrences();
    return () => {
      mounted = false;
    };
  }, [navigate, t]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [userAvatar]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % dashboardBannerSlides.length);
    }, 4800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const reports = useMemo<DashboardReport[]>(() => {
    const sorted = [...occurrences].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || "").getTime() || 0;
      const dateB = new Date(b.createdAt || b.updatedAt || "").getTime() || 0;
      return dateB - dateA;
    });

    return sorted.slice(0, 3).map((item, index) => {
      const normalizedStatus = (item.status || "").toLowerCase();
      const tone: ReportTone =
        normalizedStatus.includes("resolv")
          ? "done"
          : normalizedStatus.includes("progress") || normalizedStatus.includes("andamento")
            ? "progress"
            : "open";

      const statusByTone: Record<ReportTone, string> = {
        open: t("dashboard.reports.open"),
        progress: t("dashboard.reports.progress"),
        done: t("dashboard.reports.resolved"),
      };

      return {
        id: String(item.id ?? `occ-${index}`),
        occurrenceId: item.id !== undefined && item.id !== null ? String(item.id) : undefined,
        status: statusByTone[tone],
        title: item.title || item.category || t("dashboard.reports.untitled"),
        time: toTimeLabel(item.createdAt || item.updatedAt, i18n.language, t("dashboard.reports.noDate")),
        tone,
      };
    });
  }, [occurrences, i18n.language, t]);

  const activeLanguage =
    languageOptions.find((option) => option.code === i18n.language) ||
    languageOptions[0];

  const handleSessionAction = () => {
    if (!authenticated) {
      navigate("/login", { replace: true, state: { from: "/dashboard" } });
      return;
    }

    clearAccessToken();
    navigate("/login", { replace: true });
  };

  const handleLanguageChange = (language: string) => {
    void i18n.changeLanguage(language);
    setLanguageMenuOpen(false);
  };

  const handleCreateOccurrence = () => {
    if (!authenticated) {
      redirectToLogin("/occurrences/new");
      return;
    }
    navigate("/occurrences/new");
  };

  return (
    <main className="dashboard-screen">
      <section className="dashboard-phone" aria-label="Dashboard">
        <header className="dashboard-header">
          <div className="dashboard-user">
            {userAvatar && !avatarLoadFailed ? (
              <img
                className="dashboard-avatar"
                src={userAvatar}
                alt={authenticated ? `Fotografia de ${userName}` : "Fotografia do utilizador"}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <span className="dashboard-avatar dashboard-avatar-initial" aria-hidden="true">
                {userInitial}
              </span>
            )}
            <div>
              <h1 className="dashboard-greeting">{t("dashboard.greeting", { name: userName })}</h1>
              <p className="dashboard-location">{t("dashboard.location")}</p>
            </div>
          </div>

          <div className="dashboard-actions">
            <div className="dashboard-language-switcher">
              <button
                className="dashboard-icon-button dashboard-language-button"
                type="button"
                aria-label={t("dashboard.languageAria")}
                aria-expanded={languageMenuOpen}
                onClick={() => setLanguageMenuOpen((open) => !open)}
              >
                <span className="dashboard-language-flag">{activeLanguage.flag}</span>
              </button>

              {languageMenuOpen && (
                <div className="dashboard-language-menu" role="menu">
                  {languageOptions.map((language) => (
                    <button
                      key={language.code}
                      className={[
                        "dashboard-language-option",
                        language.code === activeLanguage.code ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      role="menuitem"
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      <span className="dashboard-language-flag">{language.flag}</span>
                      <span>{t(`languages.${language.code}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="dashboard-icon-button dashboard-logout-button"
              type="button"
              aria-label={authenticated ? t("dashboard.logoutAria") : t("auth.loginButton")}
              onClick={handleSessionAction}
            >
              {authenticated ? t("dashboard.logout") : t("auth.loginButton")}
            </button>
          </div>
        </header>

        <section className="dashboard-banner">
          <div className="dashboard-banner-track" aria-live="polite">
            {dashboardBannerSlides.map((slide, index) => (
              <div
                key={slide.src}
                className={[
                  "dashboard-banner-slide",
                  index === activeBannerIndex ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden={index !== activeBannerIndex}
              >
                <img className="dashboard-banner-image" src={slide.src} alt={slide.alt} />
              </div>
            ))}
          </div>
          <div className="dashboard-banner-copy">
            <h2>{t("dashboard.bannerTitle")}</h2>
            <p>{t("dashboard.bannerCopy")}</p>
            <button className="dashboard-cta" type="button" onClick={handleCreateOccurrence}>
              {t("dashboard.bannerButton")}
            </button>
          </div>
          <div className="dashboard-banner-controls" aria-label="Controles do carrossel">
            <div className="dashboard-banner-dots" aria-label="Selecao de imagem">
              {dashboardBannerSlides.map((slide, index) => (
                <button
                  key={`${slide.src}-dot`}
                  className={[
                    "dashboard-banner-dot",
                    index === activeBannerIndex ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  aria-label={t("dashboard.carouselCurrent", { index: index + 1 })}
                  aria-pressed={index === activeBannerIndex}
                  onClick={() => setActiveBannerIndex(index)}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="dashboard-layout">
          <div className="dashboard-primary">
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h3 className="dashboard-section-title">
                  {authenticated ? t("dashboard.reportsTitle") : t("dashboard.publicReportsTitle")}
                </h3>
                <button
                  className="dashboard-view-all"
                  type="button"
                  onClick={() => navigate("/occurrences/public")}
                >
                  {t("dashboard.viewAll")}
                </button>
              </div>

              <div className="dashboard-report-list">
                {reportsLoading && <p>{t("dashboard.reportsLoading")}</p>}
                {!reportsLoading && reportsError && <p>{reportsError}</p>}
                {!reportsLoading && !reportsError && reports.length === 0 && (
                  <p>{authenticated ? t("dashboard.reportsEmpty") : t("dashboard.publicReportsEmpty")}</p>
                )}
                {!reportsLoading &&
                  !reportsError &&
                  reports.map((report) => (
                    <OccurrenceCard
                      key={report.id}
                      status={report.status}
                      title={report.title}
                      time={report.time}
                      tone={report.tone}
                      onClick={
                        report.occurrenceId
                          ? () => navigate(`/occurrences/public/${report.occurrenceId}`)
                          : undefined
                      }
                    />
                  ))}
              </div>
            </section>
          </div>

        </div>

      </section>
    </main>
  );
}
