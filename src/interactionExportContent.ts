import type { AppState, VendorContactMethod, VendorPhoto } from './types';
import { projectById, propertyById, vendorById } from './storage';
import { vendorContactMethodLabel } from './vendorContactMethod';
import { formatDate, formatDisplayDate, nowISO } from './utils';

export type InteractionExportRow = { label: string; value: string };
export type InteractionExportPhoto = {
  uri: string;
  label: string;
  notes?: string;
  /** width / height — used so share images keep natural aspect without clipping. */
  aspectRatio?: number;
};

export type InteractionExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  rows: InteractionExportRow[];
  photos: InteractionExportPhoto[];
  exportedAtLabel: string;
};

function row(label: string, value?: string | null): InteractionExportRow | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return { label, value: trimmed };
}

export function buildInteractionExportSnapshot(params: {
  state: AppState;
  vendorId?: string;
  propertyId?: string;
  projectId?: string;
  occurredAtISO: string;
  contactMethod: VendorContactMethod;
  contactName?: string;
  notes?: string;
  important?: boolean;
  photos: VendorPhoto[];
}): InteractionExportSnapshot | null {
  const vendor = params.vendorId ? vendorById(params.state, params.vendorId) : undefined;
  const project =
    (params.projectId ? projectById(params.state, params.projectId) : undefined) ??
    (vendor ? projectById(params.state, vendor.projectId) : undefined);
  const property =
    (params.propertyId ? propertyById(params.state, params.propertyId) : undefined) ??
    (project ? propertyById(params.state, project.propertyId) : undefined);

  if (!vendor && !property) return null;

  const metaLines = [property?.name, project?.name, property?.address]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());

  const rows = [
    row('Date', formatDisplayDate(params.occurredAtISO)),
    params.important === true ? row('Important', 'Yes') : null,
    row('How contacted', vendorContactMethodLabel(params.contactMethod)),
    row('Contact', params.contactName),
    row('Notes', params.notes),
  ].filter((entry): entry is InteractionExportRow => entry != null);

  const photos = params.photos.map((photo) => ({
    uri: photo.localUri,
    label: photo.caption?.trim() || 'Photo',
    notes: photo.notes?.trim() || undefined,
  }));

  const subtitle =
    vendor?.name?.trim() ||
    params.contactName?.trim() ||
    property?.name?.trim() ||
    'Interaction';

  return {
    title: 'Interaction',
    subtitle,
    metaLines,
    rows,
    photos,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
