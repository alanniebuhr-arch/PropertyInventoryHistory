import type { AppState, ProjectVendor, VendorInteraction } from './types';
import { photosForProject } from './projectPhotos';
import { photosForVendor } from './vendorPhotos';
import {
  interactionsForVendor,
  projectById,
  propertyById,
  vendorsForProject,
} from './storage';
import { vendorStatusLabel } from './vendorStatus';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatDate, nowISO } from './utils';

export type ProjectExportRow = { label: string; value: string };
export type ProjectExportSection = { title: string; rows: ProjectExportRow[] };
export type ProjectExportPhoto = { uri: string; label: string };
export type ProjectExportInteraction = {
  date: string;
  detail: string;
};
export type ProjectExportVendor = {
  title: string;
  lines: string[];
  interactions: ProjectExportInteraction[];
  photos: ProjectExportPhoto[];
};

export type ProjectExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  sections: ProjectExportSection[];
  photos: ProjectExportPhoto[];
  vendors: ProjectExportVendor[];
  exportedAtLabel: string;
};

function row(label: string, value?: string | null): ProjectExportRow | null {
  const trimmed = value?.trim();
  return trimmed ? { label, value: trimmed } : null;
}

function section(title: string, rows: (ProjectExportRow | null)[]): ProjectExportSection | null {
  const filtered = rows.filter((r): r is ProjectExportRow => r != null);
  return filtered.length > 0 ? { title, rows: filtered } : null;
}

function pushSection(sections: ProjectExportSection[], next: ProjectExportSection | null) {
  if (next) sections.push(next);
}

function interactionDetail(interaction: VendorInteraction): string {
  const parts = [
    vendorContactMethodLabel(interaction.contactMethod),
    interaction.contactName?.trim() || undefined,
    interaction.notes?.trim() || undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.join(' · ');
}

function buildVendorExport(state: AppState, vendor: ProjectVendor): ProjectExportVendor {
  const lines = [
    vendorStatusLabel(vendor.status),
    [vendor.contactName?.trim(), vendor.phone?.trim()].filter(Boolean).join(' · ') || undefined,
    vendor.website?.trim() || undefined,
    vendor.companySummary?.trim() || undefined,
    vendor.notes?.trim() || undefined,
  ].filter((line): line is string => Boolean(line));

  const interactions = interactionsForVendor(state, vendor.id).map((interaction) => ({
    date: formatDate(interaction.occurredAtISO),
    detail: interactionDetail(interaction),
  }));

  const photos = photosForVendor(state, vendor.id).map((photo) => ({
    uri: photo.localUri,
    label: photo.caption?.trim() || 'Photo',
  }));

  return { title: vendor.name, lines, interactions, photos };
}

export function buildProjectExportSnapshot(
  state: AppState,
  projectId: string
): ProjectExportSnapshot | null {
  const project = projectById(state, projectId);
  if (!project) return null;

  const property = propertyById(state, project.propertyId);
  const vendors = vendorsForProject(state, projectId);

  const metaLines = [property?.name, property?.address]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());

  const sections: ProjectExportSection[] = [];
  pushSection(sections, section('Description', [row('Details', project.description)]));
  pushSection(sections, section('Intro to vendors', [row('Note', project.vendorIntroNote)]));

  const photos = photosForProject(state, projectId).map((photo) => ({
    uri: photo.localUri,
    label: photo.caption?.trim() || 'Photo',
  }));

  return {
    title: project.name,
    subtitle: 'Property Asset Manager',
    metaLines,
    sections,
    photos,
    vendors: vendors.map((vendor) => buildVendorExport(state, vendor)),
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
