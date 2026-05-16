import {
  ArrowLeft,
  Check,
  FileText,
  Home,
  Mail,
  MapPinned,
  Pencil,
  Plus,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  fetchAuthenticatedProfile,
  ProfileRequestError,
  updateAuthenticatedProfile,
  type ApiProfileUser,
  type UpdateProfilePayload,
} from "../services/profile";
import {
  clearAccessToken,
  getAccessSession,
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
  const avatarUrl = typeof profile.avatarUrl === "string" ? profile.avatarUrl.trim() : "";
  const role = typeof profile.role === "string" ? profile.role.trim().toUpperCase() : "";

  if (!id || !name || !email) return null;

  return { id, name, email, ...(avatarUrl ? { avatarUrl } : {}), ...(role ? { role } : {}) };
}

function buildProfileForm(profile: ApiProfileUser | null): UpdateProfilePayload {
  return {
    name: profile?.name || "",
    email: profile?.email || "",
    biNumber: profile?.biNumber || "",
    postalCode: profile?.postalCode || "",
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const sessionUser = getAuthenticatedUser();

  const [profile, setProfile] = useState<ApiProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProfilePayload>(() => buildProfileForm(null));
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

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
    const { token, hadStoredSession } = getAccessSession();

    if (!token) {
      clearAccessToken();
      navigate("/login", {
        replace: true,
        state: {
          from: "/profile",
          ...(hadStoredSession ? { sessionExpired: true } : {}),
        },
      });
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
        setEditForm(buildProfileForm(data));

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
  const avatarUrl = profile?.avatarUrl || sessionUser?.avatarUrl || "";
  const roleKey = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  const roleLabel = roleKey
    ? t(`profile.roles.${roleKey}`, {
        defaultValue: humanizeEnum(profile?.role, t("profile.unknownValue")),
      })
    : t("profile.unknownValue");
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

  const handleToggleEdit = () => {
    setSaveSuccess("");
    setSaveError("");
    setEditForm(buildProfileForm(profile));
    setIsEditing((current) => !current);
  };

  const handleFormChange = (field: keyof UpdateProfilePayload, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    if (saveSuccess) setSaveSuccess("");
    if (saveError) setSaveError("");
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim().toLowerCase(),
      biNumber: editForm.biNumber.trim(),
      postalCode: editForm.postalCode.trim(),
    };

    if (!payload.name || !payload.email || !payload.biNumber || !payload.postalCode) {
      setSaveError(t("profile.editRequired"));
      return;
    }

    const { token } = getAccessSession();
    if (!token) {
      redirectToLoginForExpiredSession();
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const data = await updateAuthenticatedProfile(token, payload, t("profile.updateError"));
      const nextProfile = { ...profile, ...data };
      setProfile(nextProfile);
      setEditForm(buildProfileForm(nextProfile));
      setIsEditing(false);
      setSaveSuccess(t("profile.updateSuccess"));

      const nextCachedUser = normalizeCacheUser(nextProfile);
      if (nextCachedUser) {
        setAuthenticatedUser(nextCachedUser);
      }
    } catch (profileError) {
      if (profileError instanceof ProfileRequestError && profileError.status === 401) {
        redirectToLoginForExpiredSession();
        return;
      }

      setSaveError(
        profileError instanceof Error && profileError.message
          ? profileError.message
          : t("profile.updateError"),
      );
    } finally {
      setSaving(false);
    }
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
          <div className="profile-avatar">
            {avatarUrl ? (
              <img
                className="profile-avatar-image"
                src={avatarUrl}
                alt={`Fotografia de ${displayName}`}
              />
            ) : (
              initials
            )}
          </div>

          <div className="profile-hero-copy">
            <h1 className="profile-name-row">
              <span>{displayName}</span>
            </h1>
            <p>{t("profile.subtitle")}</p>
          </div>

          <div className="profile-chip-stack">
            <span className="profile-chip profile-chip-role">
              <ShieldCheck size={15} strokeWidth={2.2} />
              {roleLabel}
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
                <button
                  className="profile-edit-toggle"
                  type="button"
                  onClick={handleToggleEdit}
                  disabled={saving}
                >
                  {isEditing ? (
                    <X size={16} strokeWidth={2.2} />
                  ) : (
                    <Pencil size={16} strokeWidth={2.2} />
                  )}
                  {isEditing ? t("profile.actions.cancelEdit") : t("profile.actions.edit")}
                </button>
              </div>

              {isEditing ? (
                <form className="profile-details-grid" onSubmit={handleSaveProfile}>
                  <label className="profile-detail-card profile-edit-field">
                    <span>
                      <User size={16} strokeWidth={2.1} />
                      {t("profile.fields.name")}
                    </span>
                    <input
                      value={editForm.name}
                      onChange={(event) => handleFormChange("name", event.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className="profile-detail-card profile-edit-field">
                    <span>
                      <Mail size={16} strokeWidth={2.1} />
                      {t("profile.fields.email")}
                    </span>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) => handleFormChange("email", event.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className="profile-detail-card profile-edit-field">
                    <span>
                      <ShieldCheck size={16} strokeWidth={2.1} />
                      {t("profile.fields.biNumber")}
                    </span>
                    <input
                      value={editForm.biNumber}
                      onChange={(event) => handleFormChange("biNumber", event.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className="profile-detail-card profile-edit-field">
                    <span>
                      <MapPinned size={16} strokeWidth={2.1} />
                      {t("profile.fields.postalCode")}
                    </span>
                    <input
                      value={editForm.postalCode}
                      onChange={(event) => handleFormChange("postalCode", event.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <button className="profile-save-button" type="submit" disabled={saving}>
                    <Check size={16} strokeWidth={2.2} />
                    {saving ? t("profile.actions.saving") : t("profile.actions.save")}
                  </button>
                </form>
              ) : (
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
              )}

              {saveSuccess && <p className="profile-feedback is-success">{saveSuccess}</p>}
              {saveError && <p className="profile-feedback is-error">{saveError}</p>}
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

      </section>
    </main>
  );
}
