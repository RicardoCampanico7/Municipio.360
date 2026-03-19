import { ArrowLeft, Clock3, FileText, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  OccurrencesRequestError,
  fetchPublicOccurrenceById,
  type ApiOccurrence,
} from "../services/occurrences";
import "./PublicOccurrenceDetail.css";

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
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PublicOccurrenceDetail() {
  const navigate = useNavigate();
  const { occurrenceId = "" } = useParams();
  const { i18n, t } = useTranslation();
  const [occurrence, setOccurrence] = useState<ApiOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageText = i18n.language.startsWith("pt")
    ? {
        back: "Voltar a ocorrencias",
        kicker: "Detalhe",
        eyebrow: "Registo publico",
        loading: "A carregar detalhe da ocorrencia...",
        loadError: "Nao foi possivel carregar esta ocorrencia.",
        notFound: "Ocorrencia nao encontrada.",
        noDescription: "Sem descricao disponivel.",
        noLocation: "Localizacao nao disponivel.",
        noDate: "Sem data",
        sectionInfo: "Informacao",
        sectionGallery: "Imagens",
        sectionGalleryCopy: "Registos visuais associados a esta ocorrencia.",
        summaryTitle: "Resumo",
        summaryCopy: "Consulta os dados visiveis desta ocorrencia publica.",
        occurrenceImageAlt: "Imagem da ocorrencia",
      }
    : {
        back: "Back to reports",
        kicker: "Detail",
        eyebrow: "Public record",
        loading: "Loading occurrence details...",
        loadError: "Could not load this occurrence.",
        notFound: "Occurrence not found.",
        noDescription: t("publicReports.noDescription"),
        noLocation: t("publicReports.noLocation"),
        noDate: t("dashboard.reports.noDate"),
        sectionInfo: "Information",
        sectionGallery: "Images",
        sectionGalleryCopy: "Visual records associated with this occurrence.",
        summaryTitle: "Summary",
        summaryCopy: "Review the public details for this occurrence.",
        occurrenceImageAlt: t("publicReports.imageAlt"),
      };

  useEffect(() => {
    let mounted = true;

    const loadOccurrence = async () => {
      if (!occurrenceId) {
        setError(pageText.notFound);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await fetchPublicOccurrenceById(occurrenceId, pageText.loadError);
        if (!mounted) return;
        setOccurrence(data);
      } catch (requestError) {
        if (!mounted) return;
        if (requestError instanceof OccurrencesRequestError && requestError.status === 404) {
          setError(pageText.notFound);
        } else {
          setError(pageText.loadError);
        }
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void loadOccurrence();

    return () => {
      mounted = false;
    };
  }, [occurrenceId, pageText.loadError, pageText.notFound]);

  const tone = getTone(occurrence?.status);
  const statusLabel = useMemo(
    () => t(`dashboard.reports.${tone === "done" ? "resolved" : tone}`),
    [t, tone],
  );
  const heroImage = occurrence?.imageUrls?.[0] || "/banner.ocorrencias.png";

  return (
    <main className="public-occurrence-screen">
      <section className="public-occurrence-shell" aria-label="Detalhe da ocorrencia">
        <header className="public-occurrence-header">
          <div className="public-occurrence-brand-wrap">
            <button className="public-occurrence-back" type="button" onClick={() => navigate("/occurrences/public")}>
              <ArrowLeft size={16} strokeWidth={2.4} />
              {pageText.back}
            </button>

            <div className="public-occurrence-brand">
              <AppLogo className="public-occurrence-brand-logo" />
              <span>{t("appName")}</span>
            </div>
          </div>

          <span className="public-occurrence-kicker">
            <Sparkles size={14} strokeWidth={2.2} />
            {pageText.kicker}
          </span>
        </header>

        {loading && <p className="public-occurrence-feedback">{pageText.loading}</p>}
        {!loading && error && <p className="public-occurrence-feedback">{error}</p>}

        {!loading && !error && occurrence && (
          <>
            <section className="public-occurrence-hero">
              <img
                className="public-occurrence-hero-background"
                src={heroImage}
                alt={occurrence.category || pageText.occurrenceImageAlt}
              />
              <div className="public-occurrence-hero-copy">
                <p className="public-occurrence-eyebrow">{pageText.eyebrow}</p>
                <h1>{occurrence.category || t("dashboard.reports.untitled")}</h1>
                <p>{occurrence.description || pageText.noDescription}</p>
              </div>

              <aside className="public-occurrence-summary">
                <span className={`dashboard-pill dashboard-pill-${tone}`}>{statusLabel}</span>
                <div className="public-occurrence-summary-copy">
                  <h2>{pageText.summaryTitle}</h2>
                  <p>{pageText.summaryCopy}</p>
                </div>

                <dl className="public-occurrence-meta">
                  <div>
                    <dt>
                      <MapPin size={16} strokeWidth={2.1} />
                    </dt>
                    <dd>{occurrence.location || pageText.noLocation}</dd>
                  </div>
                  <div>
                    <dt>
                      <Clock3 size={16} strokeWidth={2.1} />
                    </dt>
                    <dd>
                      {getFormattedDate(
                        occurrence.createdAt || occurrence.updatedAt,
                        i18n.language,
                        pageText.noDate,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <FileText size={16} strokeWidth={2.1} />
                    </dt>
                    <dd>#{occurrence.id ?? occurrenceId}</dd>
                  </div>
                </dl>
              </aside>
            </section>

            <section className="public-occurrence-content">
              <article className="public-occurrence-panel">
                <div className="public-occurrence-panel-head">
                  <h3>{pageText.sectionInfo}</h3>
                </div>
                <p>{occurrence.description || pageText.noDescription}</p>
              </article>

              <article className="public-occurrence-panel">
                <div className="public-occurrence-panel-head">
                  <h3>{pageText.sectionGallery}</h3>
                  <p>{pageText.sectionGalleryCopy}</p>
                </div>

                <div className="public-occurrence-gallery">
                  {(occurrence.imageUrls?.length ? occurrence.imageUrls : [heroImage]).map((imageUrl, index) => (
                    <img
                      key={`${imageUrl}-${index}`}
                      className="public-occurrence-gallery-image"
                      src={imageUrl}
                      alt={`${pageText.occurrenceImageAlt} ${index + 1}`}
                    />
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}


