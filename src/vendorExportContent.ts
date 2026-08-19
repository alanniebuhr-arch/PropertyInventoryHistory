import type { AppState } from './types';
import { photosForVendor, vendorPhotoDisplayLabel } from './vendorPhotos';
import {
  interactionsForVendor,
  photosForVendorInteraction,
  projectById,
  propertyById,
  vendorById,
} from './storage';
import { vendorStatusLabel } from './vendorStatus';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatDate, formatDisplayDate, formatPhoneNumber, nowISO } from './utils';
import { interactionPhotoDisplayLabel } from './interactionPhotos';

export type VendorExportRow = { label: string; value: string };
export type VendorExportSection = { title: string; rows: VendorExportRow[] };
export type VendorExportPhoto = { uri: string; label: string; notes?: string };
export type VendorExportInteraction = {
  title: string;
  lines: string[];
  photos: VendorExportPhoto[];
};

export type VendorExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  sections: VendorExportSection[];
  photos: VendorExportPhoto[];
  interactions: VendorExportInteraction[];
  exportedAtLabel: string;
};

function row(label: string, value?: string | null): VendorExportRow | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const formatted =
    /phone/i.test(label) ? formatPhoneNumber(trimmed) || trimmed : trimmed;
  return { label, value: formatted };
}

function section(title: string, rows: (VendorExportRow | null)[]): VendorExportSection | null {
  const filtered = rows.filter((r): r is VendorExportRow => r != null);
  return filtered.length > 0 ? { title, rows: filtered } : null;
}

function pushSection(sections: VendorExportSection[], next: VendorExportSection | null) {
  if (next) sections.push(next);
}

export function buildVendorExportSnapshot(
  state: AppState,
  vendorId: string
): VendorExportSnapshot | null {
  const vendor = vendorById(state, vendorId);
  if (!vendor) return null;

  const project = projectById(state, vendor.projectId);
  const property = project ? propertyById(state, project.propertyId) : undefined;

  const metaLines = [
    property?.name,
    project?.name,
    property?.address,
    vendorStatusLabel(vendor.status),
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());

  const sections: VendorExportSection[] = [];
  pushSection(
    sections,
    section('Contact', [
      row('Contact name', vendor.contactName),
      row('Phone', vendor.phone),
      row('Website', vendor.website),
    ])
  );
  pushSection(sections, section('Notes', [row('Details', vendor.notes)]));
  pushSection(sections, section('Summary of company', [row('Summary', vendor.companySummary)]));

  const photos = photosForVendor(state, vendor.id).map((photo) => ({
    uri: photo.localUri,
    label: vendorPhotoDisplayLabel(photo),
    notes: photo.notes?.trim() || undefined,
  }));

  const interactions = interactionsForVendor(state, vendor.id).map((interaction) => {
    const lines = [
      interaction.contactName?.trim() || undefined,
      interaction.contactPhone?.trim() || undefined,
      interaction.contactEmail?.trim() || undefined,
      interaction.notes?.trim() || undefined,
    ].filter((line): line is string => Boolean(line));

    return {
      title: `${interaction.important === true ? '★ ' : ''}${formatDisplayDate(interaction.occurredAtISO)} · ${vendorContactMethodLabel(interaction.contactMethod)}`,
      lines,
      photos: photosForVendorInteraction(state, interaction.id).map((photo) => ({
        uri: photo.localUri,
        label: interactionPhotoDisplayLabel(photo),
        notes: photo.notes?.trim() || undefined,
      })),
    };
  });

  return {
    title: vendor.name,
    subtitle: 'Property Asset Manager',
    metaLines,
    sections,
    photos,
    interactions,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
