import { FileText, Home, Map, Plus, Sparkles, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import OccurrenceCard from "../components/OccurrenceCard";
import {
  clearAccessToken,
  getAccessToken,
  getAuthenticatedUser,
  isAuthenticated,
} from "../services/token";
import "./Dashboard.css";

const languageOptions = [
  { code: "pt", flag: "🇵🇹" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
] as const;

type ReportTone = "progress" | "open" | "done";

type ApiOccurrence = {
  id?: string | number;
  title?: string;
  category?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardReport = {
  id: string;
  status: string;
  title: string;
  time: string;
  tone: ReportTone;
};

function normalizeOccurrencesPayload(payload: unknown): ApiOccurrence[] {
  if (Array.isArray(payload)) {
    return payload as ApiOccurrence[];
  }

  if (payload && typeof payload === "object") {
    const source = payload as { data?: unknown; occurrences?: unknown };
    if (Array.isArray(source.data)) return source.data as ApiOccurrence[];
    if (Array.isArray(source.occurrences)) return source.occurrences as ApiOccurrence[];
  }

  return [];
}

function toTimeLabel(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale || "pt-PT");
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const sessionUser = getAuthenticatedUser();
  const userName = sessionUser?.name || t("dashboard.defaultUserName");
  const userAvatar = "/user-avatar.jpg";
  const bannerImage = "/dashboard-banner.png";
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [occurrences, setOccurrences] = useState<ApiOccurrence[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");

  const ensureAuthenticatedSession = () => {
    if (isAuthenticated()) return true;
    clearAccessToken();
    navigate("/login", { replace: true, state: { from: "/dashboard" } });
    return false;
  };

  useEffect(() => {
    if (isAuthenticated()) return;
    clearAccessToken();
    navigate("/login", { replace: true, state: { from: "/dashboard" } });
  }, [navigate]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let mounted = true;
    const loadOccurrences = async () => {
      setReportsLoading(true);
      setReportsError("");

      try {
        const response = await fetch("http://localhost:3000/occurrences", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          if (response.status === 401) {
            clearAccessToken();
            navigate("/login", {
              replace: true,
              state: { from: "/dashboard", sessionExpired: true },
            });
            return;
          }

          const message =
            Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
          throw new Error(message || t("dashboard.reportsLoadError"));
        }

        if (!mounted) return;
        const normalized = normalizeOccurrencesPayload(data);
        setOccurrences(normalized);
      } catch {
        if (!mounted) return;
        setReportsError(t("dashboard.reportsLoadError"));
      } finally {
        if (!mounted) return;
        setReportsLoading(false);
      }
    };

    void loadOccurrences();
    return () => {
      mounted = false;
    };
  }, [navigate, t]);

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

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login", { replace: true });
  };

  const handleLanguageChange = (language: string) => {
    void i18n.changeLanguage(language);
    setLanguageMenuOpen(false);
  };

  const handleCreateOccurrence = () => {
    if (!ensureAuthenticatedSession()) return;
    navigate("/occurrences/new");
  };

  const handleNavClick = (target: "home" | "create" | "map" | "reports" | "profile") => {
    if (!ensureAuthenticatedSession()) return;

    if (target === "home") {
      navigate("/dashboard");
      return;
    }

    if (target === "create") {
      navigate("/occurrences/new");
    }
  };

  return (
    <main className="dashboard-screen">
      <section className="dashboard-phone" aria-label="Dashboard">
        <header className="dashboard-header">
          <div className="dashboard-user">
            <img
              className="dashboard-avatar"
              src={userAvatar}
              alt="Fotografia do utilizador"
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
              aria-label={t("dashboard.logoutAria")}
              onClick={handleLogout}
            >
              {t("dashboard.logout")}
            </button>
          </div>
        </header>

        <section className="dashboard-banner">
          <img
            className="dashboard-banner-image"
            src={bannerImage}
            alt="Vista urbana do municipio"
          />
          <div className="dashboard-banner-copy">
            <h2>{t("dashboard.bannerTitle")}</h2>
            <p>{t("dashboard.bannerCopy")}</p>
            <button className="dashboard-cta" type="button" onClick={handleCreateOccurrence}>
              {t("dashboard.bannerButton")}
            </button>
          </div>
        </section>

        <div className="dashboard-layout">
          <div className="dashboard-primary">
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h3 className="dashboard-section-title">{t("dashboard.reportsTitle")}</h3>
                <button className="dashboard-view-all" type="button">
                  {t("dashboard.viewAll")}
                </button>
              </div>

              <div className="dashboard-report-list">
                {reportsLoading && <p>{t("dashboard.reportsLoading")}</p>}
                {!reportsLoading && reportsError && <p>{reportsError}</p>}
                {!reportsLoading && !reportsError && reports.length === 0 && (
                  <p>{t("dashboard.reportsEmpty")}</p>
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
                  <span className="dashboard-side-kicker">
                    <Sparkles size={14} strokeWidth={2.2} />
                    Painel rápido
                  </span>
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
