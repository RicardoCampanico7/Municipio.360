import { FileText, Home, Map, Plus, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import OccurrenceCard from "../components/OccurrenceCard";
import { clearAccessToken } from "../services/token";
import "./Dashboard.css";

const languageOptions = [
  { code: "pt", flag: "🇵🇹" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
] as const;

type ReportTone = "progress" | "open" | "done";

export default function Dashboard() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const userAvatar = "/user-avatar.jpg";
  const bannerImage = "/dashboard-banner.png";
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const reportStats = [
    { value: 3, label: t("dashboard.stats.open") },
    { value: 1, label: t("dashboard.stats.progress") },
    { value: 5, label: t("dashboard.stats.resolved") },
  ];

  const reports: Array<{
    status: string;
    title: string;
    time: string;
    tone: ReportTone;
  }> = [
    {
      status: t("dashboard.reports.progress"),
      title: t("dashboard.reports.firstTitle"),
      time: t("dashboard.reports.firstTime"),
      tone: "progress",
    },
    {
      status: t("dashboard.reports.open"),
      title: t("dashboard.reports.secondTitle"),
      time: t("dashboard.reports.secondTime"),
      tone: "open",
    },
    {
      status: t("dashboard.reports.resolved"),
      title: t("dashboard.reports.thirdTitle"),
      time: t("dashboard.reports.thirdTime"),
      tone: "done",
    },
  ];

  const navItems = [
    { icon: Home, label: t("dashboard.nav.home"), active: true },
    { icon: Map, label: t("dashboard.nav.map") },
    { icon: Plus, label: t("dashboard.nav.create"), accent: true },
    { icon: FileText, label: t("dashboard.nav.reports") },
    { icon: User, label: t("dashboard.nav.profile") },
  ];

  const activeLanguage =
    languageOptions.find((option) => option.code === i18n.language) ||
    languageOptions[0];

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login");
  };

  const handleLanguageChange = (language: string) => {
    void i18n.changeLanguage(language);
    setLanguageMenuOpen(false);
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
              <h1 className="dashboard-greeting">{t("dashboard.greeting")}</h1>
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
              className="dashboard-icon-button"
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
            <button className="dashboard-cta" type="button">
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
                {reports.map((report) => (
                  <OccurrenceCard
                    key={report.title}
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
            <section className="dashboard-section">
              <h3 className="dashboard-section-title">{t("dashboard.summaryTitle")}</h3>
              <div className="dashboard-stats">
                {reportStats.map((stat) => (
                  <article className="dashboard-stat-card" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-section">
              <h3 className="dashboard-section-title">Mapa de ocorrencias</h3>
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
