import { ArrowLeft, Clock3, FileText, MapPin, Navigation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import { fetchPublicOccurrences, type PublicOccurrence } from "../services/occurrences";
import "./OccurrenceMap.css";

type ReportTone = "progress" | "open" | "done";

type MapOccurrence = {
  id: string;
  title: string;
  location: string;
  mapQuery: string;
  mapsHref: string;
  description: string;
  statusLabel: string;
  tone: ReportTone;
  createdAt: string | undefined;
  imageUrl: string | undefined;
};

function getTone(occurrence: Pick<PublicOccurrence, "status" | "statusKey">): ReportTone {
  if (occurrence.statusKey === "CONCLUIDA") return "done";
  if (occurrence.statusKey === "EM_TRATAMENTO") return "progress";

  const normalizedStatus = (occurrence.status || "").toLowerCase();
  if (normalizedStatus.includes("resolv")) return "done";
  if (normalizedStatus.includes("progress") || normalizedStatus.includes("andamento")) {
    return "progress";
  }

  return "open";
}

function isActiveOccurrence(occurrence: Pick<PublicOccurrence, "status" | "statusKey">) {
  return getTone(occurrence) !== "done";
}

function formatDate(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale || "pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatOccurrenceCategory(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    BURACOS_PAVIMENTO: "Buracos no pavimento",
    ILUMINACAO_PUBLICA: "Iluminação pública",
    LIMPEZA_URBANA: "Limpeza urbana",
    RUIDO: "Ruído",
    ESPACOS_PUBLICOS: "Espaços públicos",
    SINALIZACAO: "Sinalização",
    OUTROS: "Outros",
  };

  if (labels[normalized]) return labels[normalized];

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OccurrenceMap() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [occurrences, setOccurrences] = useState<MapOccurrence[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const pageText = i18n.language.startsWith("pt")
    ? {
        back: "Voltar",
        eyebrow: "Mapa de ocorrências",
        title: "Ocorrências ativas no mapa",
        copy: "Consulta no mapa as ocorrências que continuam em aberto ou em tratamento.",
        loading: "A carregar ocorrências ativas...",
        loadError: "Não foi possível carregar o mapa de ocorrências.",
        empty: "Não existem ocorrências ativas para apresentar neste momento.",
        mapLabel: "Mapa das ocorrências ativas",
        stageLabel: "Google Maps da ocorrência selecionada",
        listTitle: "Ocorrências ativas",
        listCopy: "Seleciona uma ocorrência para atualizar o mapa.",
        selectedTitle: "Ocorrência selecionada",
        selectedFallback: "Seleciona uma ocorrência para ver a informação correspondente.",
        openDetail: "Abrir detalhe",
        openMaps: "Abrir no Google Maps",
        mapUnavailable: "Esta ocorrência ainda não tem uma localização válida para apresentar no mapa.",
        noDescription: "Sem descrição disponível.",
        noLocation: "Localização não disponível.",
        noDate: "Sem data",
        mapped: "com localização",
        total: "ativas",
      }
    : {
        back: "Back",
        eyebrow: "Occurrence map",
        title: "Active occurrences on the map",
        copy: "View occurrences that are still open or in progress directly on the map.",
        loading: "Loading active occurrences...",
        loadError: "Could not load the occurrence map.",
        empty: "There are no active occurrences to display right now.",
        mapLabel: "Map of active occurrences",
        stageLabel: "Google Maps for the selected occurrence",
        listTitle: "Active occurrences",
        listCopy: "Select an occurrence to update the map.",
        selectedTitle: "Selected occurrence",
        selectedFallback: "Select an occurrence to inspect its details.",
        openDetail: "Open details",
        openMaps: "Open in Google Maps",
        mapUnavailable: "This occurrence does not have a valid location to display on the map.",
        noDescription: "No description available.",
        noLocation: "Location not available.",
        noDate: "No date",
        mapped: "with location",
        total: "active",
      };

  useEffect(() => {
    let mounted = true;

    const loadMapData = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchPublicOccurrences(pageText.loadError);
        if (!mounted) return;

        const activeOccurrences = data
          .filter((item) => isActiveOccurrence(item))
          .map((item, index) => {
            const tone = getTone(item);
            const statusLabel =
              tone === "done"
                ? t("dashboard.reports.resolved")
                : tone === "progress"
                  ? t("dashboard.reports.progress")
                  : t("dashboard.reports.open");

            return {
              id: String(item.id ?? `map-${index}`),
              title: formatOccurrenceCategory(item.category, t("dashboard.reports.untitled")),
              location: item.location?.trim() || pageText.noLocation,
              mapQuery: item.location?.trim() || "",
              mapsHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location?.trim() || pageText.noLocation)}`,
              description: item.description || pageText.noDescription,
              statusLabel,
              tone,
              createdAt: item.createdAt || item.updatedAt,
              imageUrl: item.imageUrls?.[0],
            };
          });

        setOccurrences(activeOccurrences);
        setSelectedId((current) => current || activeOccurrences[0]?.id || "");
      } catch {
        if (!mounted) return;
        setError(pageText.loadError);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void loadMapData();

    return () => {
      mounted = false;
    };
  }, [pageText.loadError, pageText.noDescription, pageText.noLocation, t]);

  useEffect(() => {
    if (!occurrences.length) return;
    if (occurrences.some((item) => item.id === selectedId)) return;
    setSelectedId(occurrences[0].id);
  }, [occurrences, selectedId]);

  const selectedOccurrence = useMemo(
    () => occurrences.find((item) => item.id === selectedId) ?? occurrences[0] ?? null,
    [occurrences, selectedId],
  );
  const geolocatedCount = useMemo(
    () => occurrences.filter((item) => Boolean(item.mapQuery)).length,
    [occurrences],
  );
  const googleMapsEmbedUrl = selectedOccurrence?.mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(selectedOccurrence.mapQuery)}&z=16&output=embed`
    : "";

  return (
    <main className="occurrence-map-screen">
      <section className="occurrence-map-shell" aria-label={pageText.mapLabel}>
        <header className="occurrence-map-header">
          <div className="occurrence-map-brand-wrap">
            <button className="occurrence-map-back" type="button" onClick={() => navigate("/dashboard")}>
              <ArrowLeft size={16} strokeWidth={2.4} />
              {pageText.back}
            </button>

            <div className="occurrence-map-brand">
              <AppLogo className="occurrence-map-brand-logo" />
              <span>{t("appName")}</span>
            </div>
          </div>
        </header>

        <section className="occurrence-map-hero">
          <div className="occurrence-map-hero-copy">
            <p className="occurrence-map-eyebrow">{pageText.eyebrow}</p>
            <h1>{pageText.title}</h1>
            <p>{pageText.copy}</p>
          </div>

          <div className="occurrence-map-stats" aria-label={pageText.mapLabel}>
            <article className="occurrence-map-stat-card">
              <strong>{occurrences.length}</strong>
              <span>{pageText.total}</span>
            </article>
            <article className="occurrence-map-stat-card">
              <strong>{geolocatedCount}</strong>
              <span>{pageText.mapped}</span>
            </article>
          </div>
        </section>

        {loading && <p className="occurrence-map-feedback">{pageText.loading}</p>}
        {!loading && error && <p className="occurrence-map-feedback">{error}</p>}
        {!loading && !error && occurrences.length === 0 && (
          <p className="occurrence-map-feedback">{pageText.empty}</p>
        )}

        {!loading && !error && occurrences.length > 0 && (
          <div className="occurrence-map-layout">
            <section className="occurrence-map-panel occurrence-map-panel-map">
              <div className="occurrence-map-panel-head">
                <div>
                  <h2>{pageText.mapLabel}</h2>
                  <p>{pageText.stageLabel}</p>
                </div>
              </div>

              {googleMapsEmbedUrl ? (
                <div className="occurrence-map-stage">
                  <iframe
                    className="occurrence-map-embed"
                    title={pageText.stageLabel}
                    src={googleMapsEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <p className="occurrence-map-feedback">{pageText.mapUnavailable}</p>
              )}
            </section>

            <aside className="occurrence-map-sidebar">
              <section className="occurrence-map-panel occurrence-map-selected-panel">
                {selectedOccurrence ? (
                  <div className="occurrence-map-selected-card">
                    <div className="occurrence-map-selected-title-row">
                      <h3>{selectedOccurrence.title}</h3>
                      <span className={`dashboard-pill dashboard-pill-${selectedOccurrence.tone}`}>
                        {selectedOccurrence.statusLabel}
                      </span>
                    </div>
                    <p>{selectedOccurrence.description}</p>

                    <dl className="occurrence-map-meta">
                      <div>
                        <dt>
                          <MapPin size={14} strokeWidth={2.1} />
                        </dt>
                        <dd>{selectedOccurrence.location}</dd>
                      </div>
                      <div>
                        <dt>
                          <Clock3 size={14} strokeWidth={2.1} />
                        </dt>
                        <dd>
                          {formatDate(selectedOccurrence.createdAt, i18n.language, pageText.noDate)}
                        </dd>
                      </div>
                    </dl>

                    <div className="occurrence-map-actions">
                      <button
                        className="occurrence-map-action is-primary"
                        type="button"
                        onClick={() => navigate(`/occurrences/public/${selectedOccurrence.id}`)}
                      >
                        <FileText size={16} strokeWidth={2.1} />
                        <span>{pageText.openDetail}</span>
                      </button>
                      <a
                        className="occurrence-map-action is-secondary"
                        href={selectedOccurrence.mapsHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation size={16} strokeWidth={2.1} />
                        <span>{pageText.openMaps}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="occurrence-map-feedback">{pageText.selectedFallback}</p>
                )}
              </section>

              <section className="occurrence-map-panel">
                <div className="occurrence-map-panel-head">
                  <div>
                    <h2>{pageText.listTitle}</h2>
                    <p>{pageText.listCopy}</p>
                  </div>
                </div>

                <div className="occurrence-map-list">
                  {occurrences.map((occurrence) => {
                    return (
                      <button
                        key={occurrence.id}
                        type="button"
                        className={[
                          "occurrence-map-list-item",
                          selectedOccurrence?.id === occurrence.id ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedId(occurrence.id)}
                      >
                        <span className={`dashboard-pill dashboard-pill-${occurrence.tone}`}>
                          {occurrence.statusLabel}
                        </span>
                        <strong>{occurrence.title}</strong>
                        <span>{occurrence.location}</span>
                        {!occurrence.mapQuery && (
                          <em className="occurrence-map-list-note">{pageText.mapUnavailable}</em>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
