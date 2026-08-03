import type { AppState, VendorInteraction } from './types';
import {
  photosForVendorInteraction,
  projectById,
  propertyById,
  propertyIdForInteraction,
  vendorById,
} from './storage';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatDate, formatDisplayDate, nowISO } from './utils';

export type InteractionsExportPhoto = { uri: string; label: string; notes?: string };
export type InteractionsExportEntry = {
  title: string;
  lines: string[];
  photos: InteractionsExportPhoto[];
};

export type InteractionsExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  interactions: InteractionsExportEntry[];
  exportedAtLabel: string;
};

export function buildInteractionsExportSnapshot(args: {
  state: AppState;
  interactions: VendorInteraction[];
  /** Property or project name shown as the primary context line. */
  scopeTitle: string;
  /** Extra context (e.g. property name when scoped to a project). */
  scopeMetaLines?: string[];
  /** Active filter labels (vendor, method, search). */
  filterLines?: string[];
}): InteractionsExportSnapshot {
  const { state, interactions, scopeTitle, scopeMetaLines = [], filterLines = [] } = args;

  const metaLines = [...scopeMetaLines, ...filterLines]
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = interactions.flatMap((interaction) => {
    const vendor = interaction.vendorId ? vendorById(state, interaction.vendorId) : undefined;
    const vendorProject =
      (interaction.projectId ? projectById(state, interaction.projectId) : undefined) ??
      (vendor ? projectById(state, vendor.projectId) : undefined);
    const propertyId = propertyIdForInteraction(state, interaction);
    const property = propertyId ? propertyById(state, propertyId) : undefined;
    if (!vendor && !property) return [];

    const lines = [
      vendor?.name || undefined,
      interaction.contactName?.trim() || undefined,
      vendorProject?.name && property?.name !== scopeTitle ? vendorProject.name : undefined,
      !vendor && property?.name && property.name !== scopeTitle ? property.name : undefined,
      interaction.notes?.trim() || undefined,
    ].filter((line): line is string => Boolean(line));

    return [
      {
        title: `${interaction.important === true ? '★ ' : ''}${formatDisplayDate(interaction.occurredAtISO)} · ${vendorContactMethodLabel(interaction.contactMethod)}`,
        lines,
        photos: photosForVendorInteraction(state, interaction.id).map((photo) => ({
          uri: photo.localUri,
          label: photo.caption?.trim() || 'Photo',
          notes: photo.notes?.trim() || undefined,
        })),
      },
    ];
  });

  return {
    title: 'Interactions',
    subtitle: 'Property Asset Manager',
    metaLines: [scopeTitle, ...metaLines],
    interactions: entries,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
