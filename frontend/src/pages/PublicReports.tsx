import {
  ArrowLeft,
  Clock3,
  FileText,
  MapPin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import { fetchPublicOccurrences, type ApiOccurrence } from "../services/occurrences";
import "./PublicReports.css";

type ReportTone = "progress" | "open" | "done";

function getTone(status: string | undefined): ReportTone {
  const normalizedStatus = (status || "").toLowerCase();

  if (normalizedStatus.includes("resolv")) return "done";
  if (normalizedStatus.includes("progress") || normalizedStatus.includes("andamento")) {
    return "progress";
  }

  return "open";
}

function getFormattedDate(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale || "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function PublicReports() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const heroImage = "/ocuurence-public.jpg";
  const [occurrences, setOccurrences] = useState<ApiOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageText = i18n.language.startsWith("pt")
    ? {
        back: "Voltar",
        kicker: "Ocorrências",
        eyebrow: "Consulta aberta",
        pageTitle: "Ocorrências do município",
        pageCopy: "Consulta as ocorrências públicas registadas no município e acompanha o respetivo estado.",
        statsAria: "Resumo das ocorrências",
        sectionTitle: "Lista de ocorrências",
        sectionCopy: "Consulta os registos mais recentes e o respetivo estado.",
        loading: "A carregar ocorrências...",
        loadError: "Não foi possível carregar as ocorrências.",
        empty: "Ainda não existem ocorrências.",
        noDescription: "Sem descrição disponível.",
        noLocation: "Localização não disponível.",
        imageAlt: "Imagem da ocorrência",
        stats: {
          total: "Total de ocorrências",
          progress: "Em progresso",
          resolved: "Resolvidas",
        },
      }
    : {
        back: t("publicReports.back"),
        kicker: t("publicReports.kicker"),
        eyebrow: t("publicReports.eyebrow"),
        pageTitle: t("publicReports.pageTitle"),
        pageCopy: t("publicReports.pageCopy"),
        statsAria: t("publicReports.statsAria"),
        sectionTitle: t("publicReports.sectionTitle"),
        sectionCopy: t("publicReports.sectionCopy"),
        loading: t("publicReports.loading"),
        loadError: t("publicReports.loadError"),
        empty: t("publicReports.empty"),
        noDescription: t("publicReports.noDescription"),
        noLocation: t("publicReports.noLocation"),
        imageAlt: t("publicReports.imageAlt"),
        stats: {
          total: t("publicReports.stats.total"),
          progress: t("publicReports.stats.progress"),
          resolved: t("publicReports.stats.resolved"),
        },
      };

  useEffect(() => {
    let mounted = true;

    const loadOccurrences = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchPublicOccurrences(pageText.loadError);
        if (!mounted) return;
        setOccurrences(data);
      } catch {
        if (!mounted) return;
        setError(pageText.loadError);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void loadOccurrences();

    return () => {
      mounted = false;
    };
  }, [pageText.loadError]);

  const stats = useMemo(
    () => [
        {
        label: pageText.stats.total,
        value: occurrences.length,
      },
      {
        label: pageText.stats.progress,
        value: occurrences.filter((item) => getTone(item.status) === "progress").length,
      },
      {
        label: pageText.stats.resolved,
        value: occurrences.filter((item) => getTone(item.status) === "done").length,
      },
    ],
    [occurrences, pageText.stats.progress, pageText.stats.resolved, pageText.stats.total],
  );

  return (
    <main className="public-reports-screen">
      <section className="public-reports-shell" aria-label={pageText.pageTitle}>
        <header className="public-reports-header">
          <div className="public-reports-brand-wrap">
            <button className="public-reports-back" type="button" onClick={() => navigate("/dashboard")}>
              <ArrowLeft size={16} strokeWidth={2.4} />
              {pageText.back}
            </button>

            <div className="public-reports-brand">
              <AppLogo className="public-reports-brand-logo" />
              <span>{t("appName")}</span>
            </div>
          </div>

        </header>

        <section className="public-reports-hero">
          <img
            className="public-reports-hero-background"
            src={heroImage}
            alt="Vista do municipio"
          />
          <div className="public-reports-hero-copy">
            <p className="public-reports-eyebrow">{pageText.eyebrow}</p>
            <h1>{pageText.pageTitle}</h1>
            <p>{pageText.pageCopy}</p>
          </div>

          <div className="public-reports-side" aria-label={pageText.statsAria}>
            <div className="public-reports-stats">
              {stats.map((stat) => (
                <article className="public-reports-stat-card" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-reports-list-section">
          <div className="public-reports-section-head">
            <div>
              <h2>{pageText.sectionTitle}</h2>
              <p>{pageText.sectionCopy}</p>
            </div>
          </div>

          {loading && <p className="public-reports-feedback">{pageText.loading}</p>}
          {!loading && error && <p className="public-reports-feedback">{error}</p>}
          {!loading && !error && occurrences.length === 0 && (
            <p className="public-reports-feedback">{pageText.empty}</p>
          )}

          {!loading && !error && occurrences.length > 0 && (
            <div className="public-reports-grid">
              {occurrences.map((occurrence, index) => {
                const tone = getTone(occurrence.status);
                const statusLabel = t(`dashboard.reports.${tone === "done" ? "resolved" : tone}`);
                const imageUrl = occurrence.imageUrls?.[0];

                return (
                  <button
                    className="public-reports-card public-reports-card-button"
                    key={String(occurrence.id ?? index)}
                    type="button"
                    onClick={() => navigate(`/occurrences/public/${occurrence.id ?? index + 1}`)}
                  >
                    <div className="public-reports-card-top">
                      <span className={`dashboard-pill dashboard-pill-${tone}`}>{statusLabel}</span>
                      <span className="public-reports-id">#{occurrence.id ?? index + 1}</span>
                    </div>

                    {imageUrl ? (
                      <img
                        className="public-reports-card-image"
                        src={imageUrl}
                        alt={occurrence.category || pageText.imageAlt}
                      />
                    ) : (
                      <div className="public-reports-card-placeholder" aria-hidden="true">
                        <FileText size={26} strokeWidth={2.1} />
                      </div>
                    )}

                    <div className="public-reports-card-body">
                      <h3>{occurrence.category || t("dashboard.reports.untitled")}</h3>
                      <p>{occurrence.description || pageText.noDescription}</p>
                    </div>

                    <dl className="public-reports-meta">
                      <div>
                        <dt>
                          <MapPin size={14} strokeWidth={2.1} />
                        </dt>
                        <dd>{occurrence.location || pageText.noLocation}</dd>
                      </div>
                      <div>
                        <dt>
                          <Clock3 size={14} strokeWidth={2.1} />
                        </dt>
                        <dd>
                          {getFormattedDate(
                            occurrence.createdAt || occurrence.updatedAt,
                            i18n.language,
                            t("dashboard.reports.noDate"),
                          )}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
