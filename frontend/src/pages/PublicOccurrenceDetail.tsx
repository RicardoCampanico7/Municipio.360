import { ArrowLeft, Clock3, FileText, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  OccurrencesRequestError,
  fetchPublicOccurrenceById,
  updateOccurrenceStatus,
  type OccurrenceStatusKey,
  type ApiOccurrence,
} from "../services/occurrences";
import {
  getAccessToken,
  getAuthenticatedUser,
  isBackofficeRole,
} from "../services/token";
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

function formatOccurrenceReference(
  occurrenceIdentifier: string | number | undefined,
  timestamp: string | undefined,
) {
  const rawId =
    typeof occurrenceIdentifier === "number"
      ? occurrenceIdentifier
      : Number.parseInt(String(occurrenceIdentifier ?? "").trim(), 10);

  const year =
    timestamp && !Number.isNaN(new Date(timestamp).getTime())
      ? new Date(timestamp).getFullYear()
      : new Date().getFullYear();

  if (Number.isFinite(rawId)) {
    return `M360-${year}-${String(rawId).padStart(6, "0")}`;
  }

  const fallbackId = String(occurrenceIdentifier ?? "000000").trim() || "000000";
  return `M360-${year}-${fallbackId}`;
}

function getStatusKey(
  occurrence: Pick<ApiOccurrence, "status" | "statusKey"> | null | undefined,
): OccurrenceStatusKey {
  if (occurrence?.statusKey) return occurrence.statusKey;
  if (occurrence?.status === "progress") return "EM_TRATAMENTO";
  if (occurrence?.status === "resolved") return "CONCLUIDA";
  return "SUBMETIDA";
}

export default function PublicOccurrenceDetail() {
  const navigate = useNavigate();
  const { occurrenceId = "" } = useParams();
  const { i18n, t } = useTranslation();
  const sessionUser = getAuthenticatedUser();
  const canManageOccurrence = isBackofficeRole(sessionUser?.role);
  const [occurrence, setOccurrence] = useState<ApiOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OccurrenceStatusKey>("SUBMETIDA");
  const [manageError, setManageError] = useState("");
  const [manageSuccess, setManageSuccess] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

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
        sectionInfo: "Mapa",
        mapTitle: "Mapa da ocorrencia",
        mapCopy: "Vista rapida da localizacao associada a este registo.",
        mapUnavailable: "Nao foi possivel apresentar o mapa desta ocorrencia.",
        sectionGallery: "Imagens",
        sectionGalleryCopy: "Registos visuais associados a esta ocorrencia.",
        summaryTitle: "Resumo",
        occurrenceImageAlt: "Imagem da ocorrencia",
        management: {
          title: "Gestão da ocorrência",
          copy: "Disponível apenas para operador e administrador.",
          field: "Estado da ocorrência",
          updateButton: "Atualizar estado",
          updateLoading: "A atualizar...",
          updateSuccess: "Estado atualizado com sucesso.",
          updateError: "Não foi possível atualizar o estado da ocorrência.",
          editButton: "Editar ocorrência",
          editNote: "A edição completa será adicionada numa próxima página de gestão.",
          statuses: {
            SUBMETIDA: "Submetida",
            EM_TRATAMENTO: "Em tratamento",
            CONCLUIDA: "Concluída",
          },
        },
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
        sectionInfo: "Map",
        mapTitle: "Occurrence map",
        mapCopy: "Quick view of the location associated with this record.",
        mapUnavailable: "Could not display the map for this occurrence.",
        sectionGallery: "Images",
        sectionGalleryCopy: "Visual records associated with this occurrence.",
        summaryTitle: "Summary",
        occurrenceImageAlt: t("publicReports.imageAlt"),
        management: {
          title: "Occurrence management",
          copy: "Available only to operator and administrator roles.",
          field: "Occurrence status",
          updateButton: "Update status",
          updateLoading: "Updating...",
          updateSuccess: "Status updated successfully.",
          updateError: "Could not update the occurrence status.",
          editButton: "Edit occurrence",
          editNote: "Full editing will be added in a future management page.",
          statuses: {
            SUBMETIDA: "Submitted",
            EM_TRATAMENTO: "In progress",
            CONCLUIDA: "Completed",
          },
        },
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

  useEffect(() => {
    setSelectedStatus(getStatusKey(occurrence));
  }, [occurrence]);

  const tone = getTone(occurrence?.status);
  const statusLabel = useMemo(
    () => t(`dashboard.reports.${tone === "done" ? "resolved" : tone}`),
    [t, tone],
  );
  const currentStatusKey = getStatusKey(occurrence);
  const allowedStatusOptions = useMemo(() => {
    const allOptions: OccurrenceStatusKey[] = [
      "SUBMETIDA",
      "EM_TRATAMENTO",
      "CONCLUIDA",
    ];

    if (currentStatusKey === "SUBMETIDA") return allOptions;
    if (currentStatusKey === "EM_TRATAMENTO") {
      return ["EM_TRATAMENTO", "CONCLUIDA"];
    }

    return ["CONCLUIDA"];
  }, [currentStatusKey]);
  const heroImage = occurrence?.imageUrls?.[0] || "/banner.ocorrencias.png";
  const occurrenceReference = formatOccurrenceReference(
    occurrence?.id ?? occurrenceId,
    occurrence?.createdAt || occurrence?.updatedAt,
  );
  const mapQuery = occurrence?.location?.trim() || "";
  const googleMapsEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`
    : "";

  const handleUpdateStatus = async () => {
    if (!occurrenceId) return;

    const token = getAccessToken();
    if (!token) {
      navigate("/login", {
        replace: true,
        state: { from: `/occurrences/public/${occurrenceId}` },
      });
      return;
    }

    setStatusUpdating(true);
    setManageError("");
    setManageSuccess("");

    try {
      await updateOccurrenceStatus(
        occurrenceId,
        selectedStatus,
        token,
        pageText.management.updateError,
      );

      const refreshedOccurrence = await fetchPublicOccurrenceById(
        occurrenceId,
        pageText.loadError,
      );

      setOccurrence(refreshedOccurrence);
      setManageSuccess(pageText.management.updateSuccess);
    } catch (updateError) {
      if (updateError instanceof OccurrencesRequestError && updateError.status === 401) {
        navigate("/login", {
          replace: true,
          state: { from: `/occurrences/public/${occurrenceId}` },
        });
        return;
      }

      setManageError(
        updateError instanceof Error && updateError.message
          ? updateError.message
          : pageText.management.updateError,
      );
    } finally {
      setStatusUpdating(false);
    }
  };

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
                <span className={`dashboard-pill dashboard-pill-${tone}`}>{statusLabel}</span>
              </div>

              <aside className="public-occurrence-summary">
                <div className="public-occurrence-summary-copy">
                  <h2>{pageText.summaryTitle}</h2>
                </div>

                <p className="public-occurrence-summary-description">
                  {occurrence.description || pageText.noDescription}
                </p>

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
                    <dd>{occurrenceReference}</dd>
                  </div>
                </dl>

                {canManageOccurrence && (
                  <div className="public-occurrence-management">
                    <div className="public-occurrence-management-head">
                      <h3>{pageText.management.title}</h3>
                      <p>{pageText.management.copy}</p>
                    </div>

                    <label
                      className="public-occurrence-management-label"
                      htmlFor="occurrence-status"
                    >
                      {pageText.management.field}
                    </label>
                    <select
                      id="occurrence-status"
                      className="public-occurrence-management-select"
                      value={selectedStatus}
                      onChange={(event) => {
                        setSelectedStatus(event.target.value as OccurrenceStatusKey);
                        if (manageError) setManageError("");
                        if (manageSuccess) setManageSuccess("");
                      }}
                    >
                      {allowedStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {pageText.management.statuses[statusOption as OccurrenceStatusKey]}
                        </option>
                      ))}
                    </select>

                    <div className="public-occurrence-management-actions">
                      <button
                        className="public-occurrence-management-button is-primary"
                        type="button"
                        onClick={handleUpdateStatus}
                        disabled={statusUpdating || selectedStatus === currentStatusKey}
                      >
                        {statusUpdating
                          ? pageText.management.updateLoading
                          : pageText.management.updateButton}
                      </button>
                      <button
                        className="public-occurrence-management-button is-secondary"
                        type="button"
                        disabled
                        title={pageText.management.editNote}
                      >
                        {pageText.management.editButton}
                      </button>
                    </div>

                    {manageSuccess && (
                      <p className="public-occurrence-management-feedback is-success">
                        {manageSuccess}
                      </p>
                    )}
                    {manageError && (
                      <p className="public-occurrence-management-feedback is-error">
                        {manageError}
                      </p>
                    )}

                    <p className="public-occurrence-management-note">
                      {pageText.management.editNote}
                    </p>
                  </div>
                )}
              </aside>
            </section>

            <section className="public-occurrence-content">
              <article className="public-occurrence-panel">
                <div className="public-occurrence-panel-head">
                  <h3>{pageText.sectionInfo}</h3>
                  <p>{pageText.mapCopy}</p>
                </div>

                <div className="public-occurrence-map-block">
                  {googleMapsEmbedUrl ? (
                    <div className="public-occurrence-map-frame">
                      <iframe
                        className="public-occurrence-map"
                        title={pageText.mapTitle}
                        src={googleMapsEmbedUrl}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <p className="public-occurrence-map-fallback">{pageText.mapUnavailable}</p>
                  )}
                </div>
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
