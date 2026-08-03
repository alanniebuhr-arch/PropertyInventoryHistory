import type { AppState, ProjectVendor, VendorInteraction } from './types';
import { photosForProject } from './projectPhotos';
import { slideshowPhotosForProject } from './projectFavoritePhotos';
import { photosForVendor, vendorPhotoDisplayLabel } from './vendorPhotos';
import {
  interactionsForProject,
  interactionsForVendor,
  photosForPunchItem,
  photosForVendorInteraction,
  projectById,
  propertyById,
  punchItemsForProject,
  vendorById,
  vendorsForProject,
} from './storage';
import { vendorStatusLabel } from './vendorStatus';
import { projectStatusLabel } from './projectStatus';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatCurrency, formatDate, formatDisplayDate, formatPhoneNumber, nowISO } from './utils';
import { isOverdue } from './eventRecurrence';
import { type SharePhotoMode } from './sharePhotoMode';

export type ProjectExportRow = { label: string; value: string };
export type ProjectExportSection = { title: string; rows: ProjectExportRow[] };
export type ProjectExportPhoto = { uri: string; label: string; notes?: string };
export type ProjectExportListItem = {
  title: string;
  lines: string[];
  thumbnailUri?: string;
};
export type ProjectExportInteraction = {
  date: string;
  detail: string;
  photos: ProjectExportPhoto[];
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
  punchItems: ProjectExportListItem[];
  recentInteractions: ProjectExportListItem[];
  exportedAtLabel: string;
};

export type ProjectExportSectionKey =
  | 'photos'
  | 'description'
  | 'intro'
  | 'privateNotes'
  | 'vendors'
  | 'punchList'
  | 'recentInteractions';

export type ProjectExportInclude = Record<ProjectExportSectionKey, boolean>;

export type ProjectExportOptions = {
  include?: Partial<ProjectExportInclude>;
  /** How many recent project interactions to include when the section is on (0 = collapsed on screen). */
  recentInteractionsLimit?: number;
  /** Gallery photos only; nested vendor/interaction thumbs are unchanged. */
  photoMode?: SharePhotoMode;
};

export const PROJECT_SHARE_PRESET_ALL: ProjectExportInclude = {
  photos: true,
  description: true,
  intro: true,
  privateNotes: true,
  vendors: true,
  punchList: true,
  recentInteractions: true,
};

export const PROJECT_SHARE_PRESET_INTRO: ProjectExportInclude = {
  photos: true,
  description: true,
  intro: true,
  privateNotes: false,
  vendors: false,
  punchList: false,
  recentInteractions: false,
};

export const PROJECT_SHARE_SECTION_OPTIONS: {
  key: ProjectExportSectionKey;
  label: string;
}[] = [
  { key: 'photos', label: 'Photos' },
  { key: 'description', label: 'Description' },
  { key: 'intro', label: 'Intro to vendors' },
  { key: 'privateNotes', label: 'Private notes' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'punchList', label: 'Punch list' },
  { key: 'recentInteractions', label: 'Recent interactions' },
];

function resolveInclude(options?: ProjectExportOptions): ProjectExportInclude {
  return {
    ...PROJECT_SHARE_PRESET_ALL,
    ...options?.include,
  };
}

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
    interaction.important === true ? 'Important' : undefined,
    vendorContactMethodLabel(interaction.contactMethod),
    interaction.contactName?.trim() || undefined,
    interaction.notes?.trim() || undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.join(' · ');
}

function buildVendorExport(state: AppState, vendor: ProjectVendor): ProjectExportVendor {
  const lines = [
    vendorStatusLabel(vendor.status),
    [
      vendor.contactName?.trim(),
      vendor.phone?.trim()
        ? formatPhoneNumber(vendor.phone) || vendor.phone.trim()
        : undefined,
    ]
      .filter(Boolean)
      .join(' · ') || undefined,
    vendor.website?.trim() || undefined,
    vendor.companySummary?.trim() || undefined,
    vendor.notes?.trim() || undefined,
  ].filter((line): line is string => Boolean(line));

  const interactions = interactionsForVendor(state, vendor.id).map((interaction) => ({
    date: formatDisplayDate(interaction.occurredAtISO),
    detail: interactionDetail(interaction),
    photos: photosForVendorInteraction(state, interaction.id).map((photo) => ({
      uri: photo.localUri,
      label: photo.caption?.trim() || 'Photo',
      notes: photo.notes?.trim() || undefined,
    })),
  }));

  const photos = photosForVendor(state, vendor.id).map((photo) => ({
    uri: photo.localUri,
    label: vendorPhotoDisplayLabel(photo),
    notes: photo.notes?.trim() || undefined,
  }));

  return { title: vendor.name, lines, interactions, photos };
}

export function buildProjectExportSnapshot(
  state: AppState,
  projectId: string,
  options?: ProjectExportOptions
): ProjectExportSnapshot | null {
  const project = projectById(state, projectId);
  if (!project) return null;

  const include = resolveInclude(options);
  const property = propertyById(state, project.propertyId);
  const vendors = include.vendors ? vendorsForProject(state, projectId) : [];

  const metaLines = [
    property?.name,
    property?.address,
    projectStatusLabel(project.status ?? 'research'),
    project.totalCost != null ? `Total cost ${formatCurrency(project.totalCost)}` : undefined,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());

  const sections: ProjectExportSection[] = [];
  if (include.description) {
    pushSection(sections, section('Description', [row('Details', project.description)]));
  }
  if (include.intro) {
    pushSection(sections, section('Intro to vendors', [row('Note', project.vendorIntroNote)]));
  }
  if (include.privateNotes) {
    pushSection(sections, section('Private notes', [row('Notes', project.vendorQuestionsNote)]));
  }

  const photoMode = options?.photoMode ?? 'all';
  const photos = include.photos
    ? (photoMode === 'favorites'
        ? slideshowPhotosForProject(state, projectId).map((photo) => ({
            uri: photo.uri,
            label: photo.label,
            notes: photo.notes?.trim() || undefined,
          }))
        : photosForProject(state, projectId).map((photo) => ({
            uri: photo.localUri,
            label: photo.caption?.trim() || 'Photo',
            notes: photo.notes?.trim() || undefined,
          })))
    : [];

  const punchItems: ProjectExportListItem[] = include.punchList
    ? punchItemsForProject(state, projectId).map((item) => {
        const lines = [
          item.done ? 'Done' : undefined,
          item.dueAtISO
            ? `${isOverdue(item.dueAtISO) ? 'Overdue' : 'Due'} ${formatDisplayDate(item.dueAtISO)}`
            : undefined,
          item.notes?.trim() || undefined,
        ].filter((line): line is string => Boolean(line));
        const thumb = photosForPunchItem(state, item.id)[0];
        return {
          title: item.title,
          lines,
          thumbnailUri: thumb?.localUri?.trim() || undefined,
        };
      })
    : [];

  const recentLimit = options?.recentInteractionsLimit ?? 5;
  const recentInteractions: ProjectExportListItem[] =
    include.recentInteractions && recentLimit > 0
      ? interactionsForProject(state, projectId)
          .slice(0, recentLimit)
          .map((interaction) => {
            const vendor = interaction.vendorId
              ? vendorById(state, interaction.vendorId)
              : undefined;
            const title =
              vendor?.name?.trim() ||
              interaction.contactName?.trim() ||
              'Interaction';
            const lines = [
              formatDisplayDate(interaction.occurredAtISO),
              interaction.important === true ? 'Important' : undefined,
              vendorContactMethodLabel(interaction.contactMethod),
              interaction.contactName?.trim() || undefined,
              interaction.notes?.trim() || undefined,
            ].filter((line): line is string => Boolean(line));
            const thumb = photosForVendorInteraction(state, interaction.id)[0];
            return {
              title,
              lines,
              thumbnailUri: thumb?.localUri?.trim() || undefined,
            };
          })
      : [];

  return {
    title: project.name,
    subtitle: 'Property Asset Manager',
    metaLines,
    sections,
    photos,
    vendors: vendors.map((vendor) => buildVendorExport(state, vendor)),
    punchItems,
    recentInteractions,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
