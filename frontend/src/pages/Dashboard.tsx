import { ChevronLeft, ChevronRight, FileText, Home, Map, Plus, User } from "lucide-react";
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
  clearAccessToken,
  getAccessToken,
  getAuthenticatedUser,
  getRawAccessToken,
  isAuthenticated,
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const authenticated = isAuthenticated();
  const sessionUser = getAuthenticatedUser();
  const userName = authenticated ? sessionUser?.name || t("dashboard.defaultUserName") : "visitante";
  const userAvatar = authenticated ? sessionUser?.avatarUrl || "/user-avatar.jpg" : "/user-avatar.jpg";
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [occurrences, setOccurrences] = useState<ApiOccurrence[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const carouselCopy = i18n.language.startsWith("pt")
    ? {
        previous: "Imagem anterior",
        next: "Imagem seguinte",
        current: (index: number) => `Ir para imagem ${index}`,
      }
    : {
        previous: "Previous image",
        next: "Next image",
        current: (index: number) => `Go to image ${index}`,
      };

  const publicContent = i18n.language.startsWith("pt")
    ? {
        greetingName: "visitante",
        reportsTitle: "Ocorrências públicas",
        reportsEmpty: "Ainda não existem ocorrências públicas.",
        reportsLoadError: "Não foi possível carregar as ocorrências públicas.",
      }
    : {
        greetingName: "visitor",
        reportsTitle: "Public occurrences",
        reportsEmpty: "There are no public occurrences yet.",
        reportsLoadError: "Could not load public occurrences.",
      };

  const redirectToLogin = (from: string) => {
    clearAccessToken();
    navigate("/login", { replace: true, state: { from } });
  };

  useEffect(() => {
    const token = getAccessToken();

    let mounted = true;
    const loadOccurrences = async () => {
      setReportsLoading(true);
      setReportsError("");

      try {
        const data = token
          ? await fetchMyOccurrences(token, t("dashboard.reportsLoadError"))
          : await fetchPublicOccurrences(publicContent.reportsLoadError);
        if (!mounted) return;
        setOccurrences(data);
      } catch (error) {
        if (!mounted) return;
        if (error instanceof OccurrencesRequestError && error.status === 401) {
          const hadStoredSession = !!getRawAccessToken();
          clearAccessToken();
          navigate("/login", {
            replace: true,
            state: { from: "/dashboard", ...(hadStoredSession ? { sessionExpired: true } : {}) },
          });
          return;
        }
        setReportsError(token ? t("dashboard.reportsLoadError") : publicContent.reportsLoadError);
      } finally {
        if (!mounted) return;
        setReportsLoading(false);
      }
    };

    void loadOccurrences();
    return () => {
      mounted = false;
    };
  }, [navigate, publicContent.reportsLoadError, t]);

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
        status: statusByTone[tone],
        title: item.title || item.category || t("dashboard.reports.untitled"),
        time: toTimeLabel(item.createdAt || item.updatedAt, i18n.language, t("dashboard.reports.noDate")),
        tone,
      };
    });
  }, [occurrences, i18n.language, t]);

  const reportStats = useMemo(
    () => [
      {
        value: occurrences.filter((item) => {
          const status = (item.status || "").toLowerCase();
          return !status.includes("resolv") && !status.includes("progress") && !status.includes("andamento");
        }).length,
        label: t("dashboard.stats.open"),
        tone: "open" as const,
      },
      {
        value: occurrences.filter((item) => {
          const status = (item.status || "").toLowerCase();
          return status.includes("progress") || status.includes("andamento");
        }).length,
        label: t("dashboard.stats.progress"),
        tone: "progress" as const,
      },
      {
        value: occurrences.filter((item) => (item.status || "").toLowerCase().includes("resolv")).length,
        label: t("dashboard.stats.resolved"),
        tone: "done" as const,
      },
    ],
    [occurrences, t],
  );

  const navItems = [
    { icon: Home, label: t("dashboard.nav.home"), active: true, target: "home" as const },
    { icon: Map, label: t("dashboard.nav.map"), target: "map" as const },
    { icon: Plus, label: t("dashboard.nav.create"), accent: true, target: "create" as const },
    { icon: FileText, label: t("dashboard.nav.reports"), target: "reports" as const },
    { icon: User, label: t("dashboard.nav.profile"), target: "profile" as const },
  ];

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

  const handleNavClick = (target: "home" | "create" | "map" | "reports" | "profile") => {
    if (target === "home") {
      navigate("/dashboard");
      return;
    }

    if (target === "map") {
      navigate("/occurrences/map");
      return;
    }

    if (target === "reports") {
      navigate("/occurrences/public");
      return;
    }

    if (target === "create") {
      if (!authenticated) {
        redirectToLogin("/occurrences/new");
        return;
      }
      navigate("/occurrences/new");
      return;
    }

    if (target === "profile") {
      if (!authenticated) {
        redirectToLogin("/profile");
        return;
      }
      navigate("/profile");
      return;
    }
  };

  const handlePreviousBanner = () => {
    setActiveBannerIndex((current) =>
      current === 0 ? dashboardBannerSlides.length - 1 : current - 1,
    );
  };

  const handleNextBanner = () => {
    setActiveBannerIndex((current) => (current + 1) % dashboardBannerSlides.length);
  };

  return (
    <main className="dashboard-screen">
      <section className="dashboard-phone" aria-label="Dashboard">
        <header className="dashboard-header">
          <div className="dashboard-user">
            <img
              className="dashboard-avatar"
              src={userAvatar}
              alt={authenticated ? `Fotografia de ${userName}` : "Fotografia do utilizador"}
            />
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
            <button
              className="dashboard-banner-control"
              type="button"
              aria-label={carouselCopy.previous}
              onClick={handlePreviousBanner}
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </button>

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
                  aria-label={carouselCopy.current(index + 1)}
                  aria-pressed={index === activeBannerIndex}
                  onClick={() => setActiveBannerIndex(index)}
                />
              ))}
            </div>

            <button
              className="dashboard-banner-control"
              type="button"
              aria-label={carouselCopy.next}
              onClick={handleNextBanner}
            >
              <ChevronRight size={18} strokeWidth={2.4} />
            </button>
          </div>
        </section>

        <div className="dashboard-layout">
          <div className="dashboard-primary">
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h3 className="dashboard-section-title">
                  {authenticated ? t("dashboard.reportsTitle") : publicContent.reportsTitle}
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
                  <p>{authenticated ? t("dashboard.reportsEmpty") : publicContent.reportsEmpty}</p>
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
                    />
                  ))}
              </div>
            </section>
          </div>

          <aside className="dashboard-secondary">
            <section className="dashboard-side-panel">
              <div className="dashboard-side-head">
                <div>
                  <h3 className="dashboard-section-title">{t("dashboard.summaryTitle")}</h3>
                </div>
                <p className="dashboard-side-copy">
                  Visão rápida do estado atual e das zonas com atividade.
                </p>
              </div>

              <div className="dashboard-map-section">
                <div className="dashboard-mini-map">
                  <div className="dashboard-mini-map-grid" aria-hidden="true" />
                  <div className="dashboard-mini-map-road dashboard-mini-map-road-main" />
                  <div className="dashboard-mini-map-road dashboard-mini-map-road-cross" />
                  <span className="dashboard-mini-pin dashboard-mini-pin-progress" />
                  <span className="dashboard-mini-pin dashboard-mini-pin-open" />
                  <span className="dashboard-mini-pin dashboard-mini-pin-done" />
                  <div className="dashboard-mini-map-card">
                    <strong>3 zonas ativas</strong>
                    <span>1 em progresso</span>
                  </div>
                </div>

                <div className="dashboard-map-legend" aria-label="Legenda do mapa">
                  {reportStats.map((stat) => (
                    <span
                      key={`legend-${stat.label}`}
                      className={`dashboard-pill dashboard-pill-${stat.tone}`}
                    >
                      {stat.value} {stat.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </div>

        <nav className="dashboard-bottom-nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={[
                "dashboard-nav-item",
                item.active ? "is-active" : "",
                item.accent ? "is-accent" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => handleNavClick(item.target)}
            >
              <span className="dashboard-nav-icon">
                <item.icon size={20} strokeWidth={2.2} />
              </span>
              {!item.accent && <span className="dashboard-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
