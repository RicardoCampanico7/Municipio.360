import { ArrowLeft, Clock3, FileText, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  OccurrencesRequestError,
  fetchMyOccurrences,
  fetchPublicOccurrenceById,
  updateOccurrence,
  updateOccurrenceStatus,
  type ApiOccurrence,
  type OccurrenceCategoryKey,
  type OccurrenceStatusKey,
} from "../services/occurrences";
import { getAccessToken, getAuthenticatedUser, isBackofficeRole } from "../services/token";
import "./PublicOccurrenceDetail.css";

type ReportTone = "progress" | "open" | "done";

type OccurrenceEditForm = {
  category: OccurrenceCategoryKey;
  otherCategoryDetail: string;
  location: string;
  description: string;
};

const DEFAULT_OCCURRENCE_CATEGORY: OccurrenceCategoryKey = "ILUMINACAO_PUBLICA";
const EDITABLE_OCCURRENCE_CATEGORIES: OccurrenceCategoryKey[] = [
  "BURACOS_PAVIMENTO",
  "ILUMINACAO_PUBLICA",
  "LIMPEZA_URBANA",
  "RUIDO",
  "ESPACOS_PUBLICOS",
  "SINALIZACAO",
  "OUTROS",
];

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

function buildEditForm(occurrence: ApiOccurrence | null): OccurrenceEditForm {
  return {
    category: occurrence?.categoryKey ?? DEFAULT_OCCURRENCE_CATEGORY,
    otherCategoryDetail: occurrence?.otherCategoryDetail ?? "",
    location: occurrence?.location ?? "",
    description: occurrence?.description ?? "",
  };
}

export default function PublicOccurrenceDetail() {
  const navigate = useNavigate();
  const { occurrenceId = "" } = useParams();
  const { i18n, t } = useTranslation();
  const sessionUser = getAuthenticatedUser();
  const canManageOccurrence = isBackofficeRole(sessionUser?.role);
  const [ownsOccurrence, setOwnsOccurrence] = useState(false);
  const canEditOccurrence = canManageOccurrence || ownsOccurrence;
  const [occurrence, setOccurrence] = useState<ApiOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OccurrenceStatusKey>("SUBMETIDA");
  const [manageError, setManageError] = useState("");
  const [manageSuccess, setManageSuccess] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isEditingOccurrence, setIsEditingOccurrence] = useState(false);
  const [editForm, setEditForm] = useState<OccurrenceEditForm>(() => buildEditForm(null));
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [occurrenceUpdating, setOccurrenceUpdating] = useState(false);

  const pageText = i18n.language.startsWith("pt")
    ? {
        back: "Voltar a ocorrencias",
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
          title: "Editar ocorrencia",
          copy: "Edita os dados principais desta ocorrencia.",
          field: "Estado da ocorrencia",
          updateButton: "Atualizar estado",
          updateLoading: "A atualizar...",
          updateSuccess: "Estado atualizado com sucesso.",
          updateError: "Nao foi possivel atualizar o estado da ocorrencia.",
          editButton: "Editar ocorrencia",
          cancelEditButton: "Cancelar edicao",
          saveEditButton: "Guardar alteracoes",
          saveEditLoading: "A guardar...",
          editSuccess: "Ocorrencia atualizada com sucesso.",
          editError: "Nao foi possivel guardar as alteracoes da ocorrencia.",
          categoryField: "Categoria",
          categoryDetailField: "Detalhe da categoria",
          categoryDetailPlaceholder: "Descreve a categoria personalizada",
          locationField: "Localizacao",
          locationPlaceholder: "Ex.: Avenida Central, Faro",
          descriptionField: "Descricao",
          descriptionPlaceholder: "Atualiza os detalhes desta ocorrencia.",
          validationLocation: "Indica uma localizacao valida antes de guardar.",
          validationOtherCategory:
            "Quando escolhes \"Outros\", tens de indicar o detalhe da categoria.",
          statuses: {
            SUBMETIDA: "Submetida",
            EM_TRATAMENTO: "Em tratamento",
            CONCLUIDA: "Concluida",
          },
          categories: {
            BURACOS_PAVIMENTO: "Buracos no pavimento",
            ILUMINACAO_PUBLICA: "Iluminacao publica",
            LIMPEZA_URBANA: "Limpeza urbana",
            RUIDO: "Ruido",
            ESPACOS_PUBLICOS: "Espacos publicos",
            SINALIZACAO: "Sinalizacao",
            OUTROS: "Outros",
          },
        },
      }
    : {
        back: "Back to reports",
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
          title: "Edit occurrence",
          copy: "Edit the main details of this occurrence.",
          field: "Occurrence status",
          updateButton: "Update status",
          updateLoading: "Updating...",
          updateSuccess: "Status updated successfully.",
          updateError: "Could not update the occurrence status.",
          editButton: "Edit occurrence",
          cancelEditButton: "Cancel editing",
          saveEditButton: "Save changes",
          saveEditLoading: "Saving...",
          editSuccess: "Occurrence updated successfully.",
          editError: "Could not save the occurrence changes.",
          categoryField: "Category",
          categoryDetailField: "Category detail",
          categoryDetailPlaceholder: "Describe the custom category",
          locationField: "Location",
          locationPlaceholder: "Ex.: Central Avenue, Faro",
          descriptionField: "Description",
          descriptionPlaceholder: "Update the details of this occurrence.",
          validationLocation: "Provide a valid location before saving.",
          validationOtherCategory:
            'When selecting "Other", you must provide the category detail.',
          statuses: {
            SUBMETIDA: "Submitted",
            EM_TRATAMENTO: "In progress",
            CONCLUIDA: "Completed",
          },
          categories: {
            BURACOS_PAVIMENTO: "Road surface holes",
            ILUMINACAO_PUBLICA: "Public lighting",
            LIMPEZA_URBANA: "Urban cleaning",
            RUIDO: "Noise",
            ESPACOS_PUBLICOS: "Public spaces",
            SINALIZACAO: "Signage",
            OUTROS: "Other",
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
      setOwnsOccurrence(false);
      setIsEditingOccurrence(false);

      try {
        const data = await fetchPublicOccurrenceById(occurrenceId, pageText.loadError);
        if (!mounted) return;
        setOccurrence(data);

        const token = getAccessToken();
        if (!token || canManageOccurrence || data.id === undefined || data.id === null) return;

        try {
          const myOccurrences = await fetchMyOccurrences(token, pageText.loadError);
          if (!mounted) return;

          setOwnsOccurrence(
            myOccurrences.some((item) => String(item.id ?? "") === String(data.id)),
          );
        } catch {
          if (!mounted) return;
          setOwnsOccurrence(false);
        }
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
  }, [canManageOccurrence, occurrenceId, pageText.loadError, pageText.notFound]);

  useEffect(() => {
    setSelectedStatus(getStatusKey(occurrence));
    setEditForm(buildEditForm(occurrence));
  }, [occurrence]);

  const tone = getTone(occurrence?.status);
  const statusLabel = useMemo(
    () => t(`dashboard.reports.${tone === "done" ? "resolved" : tone}`),
    [t, tone],
  );
  const currentStatusKey = getStatusKey(occurrence);
  const allowedStatusOptions = useMemo(() => {
    if (currentStatusKey === "SUBMETIDA") return ["SUBMETIDA", "EM_TRATAMENTO"];
    if (currentStatusKey === "EM_TRATAMENTO") {
      return ["EM_TRATAMENTO", "CONCLUIDA"];
    }

    return ["CONCLUIDA"];
  }, [currentStatusKey]);
  const occurrenceImages = occurrence?.imageUrls ?? [];
  const heroImage = occurrenceImages[0];
  const occurrenceReference = formatOccurrenceReference(
    occurrence?.id ?? occurrenceId,
    occurrence?.createdAt || occurrence?.updatedAt,
  );
  const mapQuery = occurrence?.location?.trim() || "";
  const googleMapsEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`
    : "";

  const redirectToLogin = () => {
    navigate("/login", {
      replace: true,
      state: { from: `/occurrences/public/${occurrenceId}` },
    });
  };

  const handleUpdateStatus = async () => {
    if (!occurrenceId) return;

    const token = getAccessToken();
    if (!token) {
      redirectToLogin();
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
        redirectToLogin();
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

  const handleToggleEdit = () => {
    if (isEditingOccurrence) {
      setEditForm(buildEditForm(occurrence));
      setIsEditingOccurrence(false);
      setEditError("");
      return;
    }

    setEditSuccess("");
    setEditError("");
    setIsEditingOccurrence(true);
  };

  const handleSaveOccurrence = async () => {
    if (!occurrenceId) return;

    const token = getAccessToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    const trimmedLocation = editForm.location.trim();
    const trimmedDescription = editForm.description.trim();
    const trimmedOtherCategoryDetail = editForm.otherCategoryDetail.trim();

    if (trimmedLocation.length < 2) {
      setEditError(pageText.management.validationLocation);
      setEditSuccess("");
      return;
    }

    if (editForm.category === "OUTROS" && trimmedOtherCategoryDetail.length < 3) {
      setEditError(pageText.management.validationOtherCategory);
      setEditSuccess("");
      return;
    }

    setOccurrenceUpdating(true);
    setEditError("");
    setEditSuccess("");

    try {
      await updateOccurrence(
        occurrenceId,
        {
          category: editForm.category,
          otherCategoryDetail:
            editForm.category === "OUTROS" ? trimmedOtherCategoryDetail : undefined,
          description: trimmedDescription || undefined,
          location: trimmedLocation,
        },
        token,
        pageText.management.editError,
      );

      const refreshedOccurrence = await fetchPublicOccurrenceById(
        occurrenceId,
        pageText.loadError,
      );

      setOccurrence(refreshedOccurrence);
      setIsEditingOccurrence(false);
      setEditSuccess(pageText.management.editSuccess);
    } catch (updateError) {
      if (updateError instanceof OccurrencesRequestError && updateError.status === 401) {
        redirectToLogin();
        return;
      }

      setEditError(
        updateError instanceof Error && updateError.message
          ? updateError.message
          : pageText.management.editError,
      );
    } finally {
      setOccurrenceUpdating(false);
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
              {heroImage && (
                <img
                  className="public-occurrence-hero-background"
                  src={heroImage}
                  alt={occurrence.category || pageText.occurrenceImageAlt}
                />
              )}
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

                {canEditOccurrence && (
                  <div className="public-occurrence-management">
                    <div className="public-occurrence-management-head">
                      <h3>{pageText.management.title}</h3>
                      <p>{pageText.management.copy}</p>
                    </div>

                    {canManageOccurrence && (
                      <>
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
                              {
                                pageText.management.statuses[
                                  statusOption as keyof typeof pageText.management.statuses
                                ]
                              }
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    <div className="public-occurrence-management-actions">
                      {canManageOccurrence && (
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
                      )}
                      <button
                        className={[
                          "public-occurrence-management-button",
                          "is-secondary",
                          canManageOccurrence ? "" : "is-full",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        type="button"
                        onClick={handleToggleEdit}
                        disabled={occurrenceUpdating}
                      >
                        {isEditingOccurrence
                          ? pageText.management.cancelEditButton
                          : pageText.management.editButton}
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

                    {isEditingOccurrence && (
                      <div className="public-occurrence-management-form">
                        <label
                          className="public-occurrence-management-label"
                          htmlFor="occurrence-category"
                        >
                          {pageText.management.categoryField}
                        </label>
                        <select
                          id="occurrence-category"
                          className="public-occurrence-management-select"
                          value={editForm.category}
                          onChange={(event) => {
                            const nextCategory = event.target.value as OccurrenceCategoryKey;
                            setEditForm((current) => ({
                              ...current,
                              category: nextCategory,
                              otherCategoryDetail:
                                nextCategory === "OUTROS" ? current.otherCategoryDetail : "",
                            }));
                            if (editError) setEditError("");
                            if (editSuccess) setEditSuccess("");
                          }}
                          disabled={occurrenceUpdating}
                        >
                          {EDITABLE_OCCURRENCE_CATEGORIES.map((categoryOption) => (
                            <option key={categoryOption} value={categoryOption}>
                              {pageText.management.categories[categoryOption]}
                            </option>
                          ))}
                        </select>

                        {editForm.category === "OUTROS" && (
                          <>
                            <label
                              className="public-occurrence-management-label"
                              htmlFor="occurrence-category-detail"
                            >
                              {pageText.management.categoryDetailField}
                            </label>
                            <input
                              id="occurrence-category-detail"
                              className="public-occurrence-management-input"
                              type="text"
                              value={editForm.otherCategoryDetail}
                              placeholder={pageText.management.categoryDetailPlaceholder}
                              onChange={(event) => {
                                setEditForm((current) => ({
                                  ...current,
                                  otherCategoryDetail: event.target.value,
                                }));
                                if (editError) setEditError("");
                                if (editSuccess) setEditSuccess("");
                              }}
                              disabled={occurrenceUpdating}
                            />
                          </>
                        )}

                        <label
                          className="public-occurrence-management-label"
                          htmlFor="occurrence-location"
                        >
                          {pageText.management.locationField}
                        </label>
                        <input
                          id="occurrence-location"
                          className="public-occurrence-management-input"
                          type="text"
                          value={editForm.location}
                          placeholder={pageText.management.locationPlaceholder}
                          onChange={(event) => {
                            setEditForm((current) => ({
                              ...current,
                              location: event.target.value,
                            }));
                            if (editError) setEditError("");
                            if (editSuccess) setEditSuccess("");
                          }}
                          disabled={occurrenceUpdating}
                        />

                        <label
                          className="public-occurrence-management-label"
                          htmlFor="occurrence-description"
                        >
                          {pageText.management.descriptionField}
                        </label>
                        <textarea
                          id="occurrence-description"
                          className="public-occurrence-management-textarea"
                          value={editForm.description}
                          placeholder={pageText.management.descriptionPlaceholder}
                          onChange={(event) => {
                            setEditForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }));
                            if (editError) setEditError("");
                            if (editSuccess) setEditSuccess("");
                          }}
                          disabled={occurrenceUpdating}
                        />

                        <button
                          className="public-occurrence-management-button is-primary is-full"
                          type="button"
                          onClick={handleSaveOccurrence}
                          disabled={occurrenceUpdating}
                        >
                          {occurrenceUpdating
                            ? pageText.management.saveEditLoading
                            : pageText.management.saveEditButton}
                        </button>
                      </div>
                    )}

                    {editSuccess && (
                      <p className="public-occurrence-management-feedback is-success">
                        {editSuccess}
                      </p>
                    )}
                    {editError && (
                      <p className="public-occurrence-management-feedback is-error">
                        {editError}
                      </p>
                    )}
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

              {occurrenceImages.length > 0 && (
                <article className="public-occurrence-panel">
                  <div className="public-occurrence-panel-head">
                    <h3>{pageText.sectionGallery}</h3>
                    <p>{pageText.sectionGalleryCopy}</p>
                  </div>

                  <div className="public-occurrence-gallery">
                    {occurrenceImages.map((imageUrl, index) => (
                      <img
                        key={`${imageUrl}-${index}`}
                        className="public-occurrence-gallery-image"
                        src={imageUrl}
                        alt={`${pageText.occurrenceImageAlt} ${index + 1}`}
                      />
                    ))}
                  </div>
                </article>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
