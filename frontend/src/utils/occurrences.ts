import type { TFunction } from "i18next";
import type { ApiOccurrence } from "../services/occurrences";

export type OccurrenceTone = "progress" | "open" | "done";

type SupportedLanguage = "pt" | "en" | "es" | "fr";

const CATEGORY_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  BURACOS_PAVIMENTO: {
    pt: "Buracos no pavimento",
    en: "Road surface damage",
    es: "Baches en el pavimento",
    fr: "Nids-de-poule et chaussee",
  },
  ILUMINACAO_PUBLICA: {
    pt: "Iluminacao publica",
    en: "Public lighting",
    es: "Iluminacion publica",
    fr: "Eclairage public",
  },
  LIMPEZA_URBANA: {
    pt: "Limpeza urbana",
    en: "Urban cleaning",
    es: "Limpieza urbana",
    fr: "Proprete urbaine",
  },
  RUIDO: {
    pt: "Ruido",
    en: "Noise",
    es: "Ruido",
    fr: "Bruit",
  },
  ESPACOS_PUBLICOS: {
    pt: "Espacos publicos",
    en: "Public spaces",
    es: "Espacios publicos",
    fr: "Espaces publics",
  },
  SINALIZACAO: {
    pt: "Sinalizacao",
    en: "Signage",
    es: "Senalizacion",
    fr: "Signalisation",
  },
  OUTROS: {
    pt: "Outros",
    en: "Other",
    es: "Otros",
    fr: "Autres",
  },
};

function getSupportedLanguage(locale: string | undefined): SupportedLanguage {
  if (locale?.startsWith("en")) return "en";
  if (locale?.startsWith("es")) return "es";
  if (locale?.startsWith("fr")) return "fr";
  return "pt";
}

function normalizeOccurrenceValue(value: string | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function humanizeOccurrenceCategory(category: string) {
  return category
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getOccurrenceTone(status: string | undefined): OccurrenceTone {
  const normalizedStatus = normalizeOccurrenceValue(status);

  if (
    normalizedStatus.includes("conclu") ||
    normalizedStatus.includes("resolved")
  ) {
    return "done";
  }

  if (
    normalizedStatus.includes("tratamento") ||
    normalizedStatus.includes("progress") ||
    normalizedStatus.includes("andamento")
  ) {
    return "progress";
  }

  return "open";
}

export function getOccurrenceStatusLabel(
  status: string | undefined,
  t: TFunction,
) {
  const tone = getOccurrenceTone(status);
  return t(`dashboard.reports.${tone === "done" ? "resolved" : tone}`);
}

export function getOccurrenceTitle(
  occurrence: Pick<ApiOccurrence, "title" | "category" | "otherCategoryDetail">,
  t: TFunction,
  locale?: string,
) {
  const explicitTitle = occurrence.title?.trim();
  if (explicitTitle) return explicitTitle;

  const otherCategoryDetail = occurrence.otherCategoryDetail?.trim();
  if (otherCategoryDetail) return otherCategoryDetail;

  const category = occurrence.category?.trim();
  if (!category) return t("dashboard.reports.untitled");

  const labels = CATEGORY_LABELS[category];
  if (labels) {
    return labels[getSupportedLanguage(locale)];
  }

  return humanizeOccurrenceCategory(category);
}
