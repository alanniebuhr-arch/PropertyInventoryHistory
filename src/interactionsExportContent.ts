import type { AppState, VendorInteraction } from './types';
import {
  photosForVendorInteraction,
  projectById,
  propertyById,
  vendorById,
} from './storage';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatDate, nowISO } from './utils';

export type InteractionsExportPhoto = { uri: string; label: string };
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
    const vendor = vendorById(state, interaction.vendorId);
    if (!vendor) return [];

    const vendorProject = projectById(state, vendor.projectId);
    const property = vendorProject
      ? propertyById(state, vendorProject.propertyId)
      : undefined;

    const lines = [
      vendor.name,
      interaction.contactName?.trim() || undefined,
      vendorProject?.name && property?.name !== scopeTitle ? vendorProject.name : undefined,
      interaction.notes?.trim() || undefined,
    ].filter((line): line is string => Boolean(line));

    return [
      {
        title: `${formatDate(interaction.occurredAtISO)} · ${vendorContactMethodLabel(interaction.contactMethod)}`,
        lines,
        photos: photosForVendorInteraction(state, interaction.id).map((photo) => ({
          uri: photo.localUri,
          label: photo.caption?.trim() || 'Photo',
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
