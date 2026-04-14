import { OccurrenceCategory, OccurrenceStatus } from '@prisma/client';
import { OCCURRENCE_CATEGORY_LABELS } from '../constants/occurrence.constants';

export type PresentableOccurrence = {
  category: OccurrenceCategory;
  otherCategoryDetail: string | null;
  status: OccurrenceStatus;
};

export type PresentedOccurrence<T extends PresentableOccurrence> = Omit<
  T,
  'category' | 'status'
> & {
  title: string;
  category: string;
  categoryKey: OccurrenceCategory;
  status: string;
  statusKey: OccurrenceStatus;
};

export type PresentableStatusHistoryEntry = {
  status: OccurrenceStatus;
  createdAt: Date;
};

export type PresentedStatusHistoryEntry<
  T extends PresentableStatusHistoryEntry,
> = Omit<T, 'status'> & {
  status: string;
  statusKey: OccurrenceStatus;
};

export function getPresentationStatus(status: OccurrenceStatus) {
  switch (status) {
    case OccurrenceStatus.CONCLUIDA:
      return 'resolved';
    case OccurrenceStatus.EM_TRATAMENTO:
      return 'progress';
    case OccurrenceStatus.SUBMETIDA:
    default:
      return 'open';
  }
}

export function getPresentationCategory(
  category: OccurrenceCategory,
  otherCategoryDetail: string | null,
) {
  if (category === OccurrenceCategory.OUTROS) {
    const customLabel = otherCategoryDetail?.trim();
    if (customLabel) return customLabel;
  }

  return OCCURRENCE_CATEGORY_LABELS[category];
}

export function presentOccurrence<T extends PresentableOccurrence>(
  occurrence: T,
): PresentedOccurrence<T> {
  const title = getPresentationCategory(
    occurrence.category,
    occurrence.otherCategoryDetail,
  );

  return {
    ...occurrence,
    title,
    categoryKey: occurrence.category,
    statusKey: occurrence.status,
    category: title,
    status: getPresentationStatus(occurrence.status),
  };
}

export function presentOccurrences<T extends PresentableOccurrence>(
  occurrences: T[],
) {
  return occurrences.map((occurrence) => presentOccurrence(occurrence));
}

export function presentStatusHistoryEntry<T extends PresentableStatusHistoryEntry>(
  statusHistoryEntry: T,
): PresentedStatusHistoryEntry<T> {
  return {
    ...statusHistoryEntry,
    statusKey: statusHistoryEntry.status,
    status: getPresentationStatus(statusHistoryEntry.status),
  };
}

export function presentStatusHistory<T extends PresentableStatusHistoryEntry>(
  statusHistory: T[],
) {
  return statusHistory.map((entry) => presentStatusHistoryEntry(entry));
}

export function presentOwnerOccurrenceDetail<
  T extends PresentableOccurrence & {
    statusHistory: PresentableStatusHistoryEntry[];
  },
>(occurrence: T) {
  return {
    ...presentOccurrence(occurrence),
    statusHistory: presentStatusHistory(occurrence.statusHistory),
  };
}
