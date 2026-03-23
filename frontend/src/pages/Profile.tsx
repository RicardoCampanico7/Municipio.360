import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Home,
  Mail,
  Map,
  MapPinned,
  Plus,
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  fetchAuthenticatedProfile,
  ProfileRequestError,
  type ApiProfileUser,
} from "../services/profile";
import {
  clearAccessToken,
  getAccessToken,
  getAuthenticatedUser,
  getRawAccessToken,
  setAuthenticatedUser,
} from "../services/token";
import "./Profile.css";

function formatDate(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale || "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function humanizeEnum(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeCacheUser(profile: ApiProfileUser) {
  const rawId = profile.id;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  const role = typeof profile.role === "string" ? profile.role.trim().toUpperCase() : "";

  if (!id || !name || !email) return null;

  return { id, name, email, ...(role ? { role } : {}) };
}

type NavTarget = "home" | "map" | "create" | "reports" | "profile";

export default function Profile() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const sessionUser = getAuthenticatedUser();

  const [profile, setProfile] = useState<ApiProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const redirectToLoginForExpiredSession = () => {
    const hadStoredSession = !!getRawAccessToken();
    clearAccessToken();
    navigate("/login", {
      replace: true,
      state: {
        from: "/profile",
        ...(hadStoredSession ? { sessionExpired: true } : {}),
      },
    });
  };

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      redirectToLoginForExpiredSession();
      return;
    }

    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchAuthenticatedProfile(token, t("profile.loadError"));
        if (!mounted) return;

        setProfile(data);

        const nextCachedUser = normalizeCacheUser(data);
        if (nextCachedUser) {
          setAuthenticatedUser(nextCachedUser);
        }
      } catch (profileError) {
        if (!mounted) return;

        if (profileError instanceof ProfileRequestError && profileError.status === 401) {
          redirectToLoginForExpiredSession();
          return;
        }

        setError(
          profileError instanceof Error && profileError.message
            ? profileError.message
            : t("profile.loadError"),
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate, t]);

  const displayName = profile?.name || sessionUser?.name || t("dashboard.defaultUserName");
  const displayEmail = profile?.email || sessionUser?.email || t("profile.unknownValue");
  const roleKey = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  const certKey = typeof profile?.certStatus === "string" ? profile.certStatus.toLowerCase() : "";
  const effectiveCertKey = sessionUser ? "certified" : certKey;
  const roleLabel = roleKey
    ? t(`profile.roles.${roleKey}`, {
        defaultValue: humanizeEnum(profile?.role, t("profile.unknownValue")),
      })
    : t("profile.unknownValue");
  const certificationLabel = effectiveCertKey
    ? t(`profile.certification.${effectiveCertKey}`, {
        defaultValue: humanizeEnum(profile?.certStatus, t("profile.unknownValue")),
      })
    : t("profile.unknownValue");
  const isVerified = Boolean(sessionUser) || certKey === "certified";
  const joinedAtLabel = formatDate(
    profile?.createdAt,
    i18n.language,
    t("profile.unknownValue"),
  );
  const updatedAtLabel = formatDate(
    profile?.updatedAt,
    i18n.language,
    t("profile.unknownValue"),
  );
  const initials = buildInitials(displayName) || "U";

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login", { replace: true });
  };

  const handleNavClick = (target: NavTarget) => {
    if (target === "home") {
      navigate("/dashboard");
      return;
    }

    if (target === "create") {
      navigate("/occurrences/new");
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

    navigate("/profile");
  };

  return (
    <main className="profile-screen">
      <section className="profile-shell" aria-label={t("profile.title")}>
        <header className="profile-header">
          <div className="profile-brand-wrap">
            <button className="profile-back" type="button" onClick={() => navigate("/dashboard")}>
              <ArrowLeft size={16} strokeWidth={2.4} />
              {t("profile.back")}
            </button>

            <div className="profile-brand">
              <AppLogo className="profile-brand-logo" />
              <span>{t("appName")}</span>
            </div>
          </div>

          <button className="profile-logout" type="button" onClick={handleLogout}>
            {t("dashboard.logout")}
          </button>
        </header>

        <section className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>

          <div className="profile-hero-copy">
            <h1 className="profile-name-row">
              <span>{displayName}</span>
              {isVerified && (
                <span className="profile-verified-badge" title={t("profile.verifiedBadge")}>
                  <BadgeCheck size={22} strokeWidth={2.2} />
                  <span className="sr-only">{t("profile.verifiedBadge")}</span>
                </span>
              )}
            </h1>
            <p>{t("profile.subtitle")}</p>
          </div>

          <div className="profile-chip-stack">
            <span className="profile-chip profile-chip-role">
              <ShieldCheck size={15} strokeWidth={2.2} />
              {roleLabel}
            </span>
            <span className="profile-chip profile-chip-certification">
              <BadgeCheck size={15} strokeWidth={2.2} />
              {certificationLabel}
            </span>
          </div>
        </section>

        {loading && <p className="profile-feedback">{t("profile.loading")}</p>}
        {!loading && error && <p className="profile-feedback is-error">{error}</p>}

        {!loading && !error && profile && (
          <div className="profile-layout">
            <section className="profile-panel">
              <div className="profile-section-head">
                <div>
                  <h2>{t("profile.sections.detailsTitle")}</h2>
                </div>
                <p>{t("profile.sections.detailsCopy")}</p>
              </div>

              <dl className="profile-details-grid">
                <div className="profile-detail-card">
                  <dt>
                    <User size={16} strokeWidth={2.1} />
                    {t("profile.fields.name")}
                  </dt>
                  <dd>{profile.name || t("profile.unknownValue")}</dd>
                </div>

                <div className="profile-detail-card">
                  <dt>
                    <Mail size={16} strokeWidth={2.1} />
                    {t("profile.fields.email")}
                  </dt>
                  <dd>{displayEmail}</dd>
                </div>

                <div className="profile-detail-card">
                  <dt>
                    <ShieldCheck size={16} strokeWidth={2.1} />
                    {t("profile.fields.biNumber")}
                  </dt>
                  <dd>{profile.biNumber || t("profile.unknownValue")}</dd>
                </div>

                <div className="profile-detail-card">
                  <dt>
                    <MapPinned size={16} strokeWidth={2.1} />
                    {t("profile.fields.postalCode")}
                  </dt>
                  <dd>{profile.postalCode || t("profile.unknownValue")}</dd>
                </div>
              </dl>
            </section>

            <aside className="profile-sidebar">
              <section className="profile-summary-card">
                <div className="profile-section-head">
                  <div>
                    <h2>{t("profile.sections.summaryTitle")}</h2>
                  </div>
                </div>

                <div className="profile-metrics">
                  <article className="profile-metric-card">
                    <span>{t("profile.metrics.role")}</span>
                    <strong>{roleLabel}</strong>
                  </article>
                  <article className="profile-metric-card">
                    <span>{t("profile.metrics.certification")}</span>
                    <strong>{certificationLabel}</strong>
                  </article>
                  <article className="profile-metric-card">
                    <span>{t("profile.metrics.memberSince")}</span>
                    <strong>{joinedAtLabel}</strong>
                  </article>
                  <article className="profile-metric-card">
                    <span>{t("profile.metrics.lastUpdate")}</span>
                    <strong>{updatedAtLabel}</strong>
                  </article>
                </div>
              </section>

              <section className="profile-actions-card">
                <div className="profile-section-head">
                  <div>
                    <h2>{t("profile.sections.actionsTitle")}</h2>
                  </div>
                  <p>{t("profile.sections.actionsCopy")}</p>
                </div>

                <div className="profile-action-list">
                  <button
                    className="profile-action-button"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                  >
                    <Home size={17} strokeWidth={2.2} />
                    <span>{t("profile.actions.dashboard")}</span>
                  </button>
                  <button
                    className="profile-action-button"
                    type="button"
                    onClick={() => navigate("/occurrences/new")}
                  >
                    <Plus size={17} strokeWidth={2.2} />
                    <span>{t("profile.actions.newOccurrence")}</span>
                  </button>
                  <button
                    className="profile-action-button"
                    type="button"
                    onClick={() => navigate("/occurrences/public")}
                  >
                    <FileText size={17} strokeWidth={2.2} />
                    <span>{t("profile.actions.publicReports")}</span>
                  </button>
                </div>
              </section>
            </aside>
          </div>
        )}

        <nav className="profile-bottom-nav" aria-label={t("profile.navigationLabel")}>
          {[
            { icon: Home, label: t("dashboard.nav.home"), target: "home" as const },
            { icon: Map, label: t("dashboard.nav.map"), target: "map" as const },
            { icon: Plus, label: t("dashboard.nav.create"), target: "create" as const, accent: true },
            { icon: FileText, label: t("dashboard.nav.reports"), target: "reports" as const },
            { icon: User, label: t("dashboard.nav.profile"), target: "profile" as const, active: true },
          ].map((item) => (
            <button
              key={item.label}
              className={[
                "profile-nav-item",
                item.active ? "is-active" : "",
                item.accent ? "is-accent" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => handleNavClick(item.target)}
            >
              <span className="profile-nav-icon">
                <item.icon size={20} strokeWidth={2.2} />
              </span>
              {!item.accent && <span className="profile-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
