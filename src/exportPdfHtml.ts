import { readPhotoAsBase64 } from './photoStorage';
import type { AssetsExportSnapshot } from './assetsExportContent';
import type { EventExportSnapshot } from './eventExportContent';
import type { InteractionExportSnapshot } from './interactionExportContent';
import type { InteractionsExportSnapshot } from './interactionsExportContent';
import type { ItemExportSnapshot } from './itemExportContent';
import type { ProjectExportSnapshot } from './projectExportContent';
import type { PropertyExportSnapshot } from './propertyExportContent';
import type { ServicesExportSnapshot } from './servicesExportContent';
import type { VendorExportSnapshot } from './vendorExportContent';

/** Max display width for embedded photos in the PDF HTML. */
const PHOTO_MAX_WIDTH_PX = 280;

export type ExportPdfPhoto = { uri: string; label: string; notes?: string };
export type ExportPdfRow = { label: string; value: string };
export type ExportPdfSection = { title: string; rows: ExportPdfRow[] };
export type ExportPdfListItem = {
  title: string;
  lines: string[];
  thumbnailUri?: string;
  photos?: ExportPdfPhoto[];
};
export type ExportPdfNestedChild = {
  title: string;
  lines: string[];
  photos?: ExportPdfPhoto[];
};
export type ExportPdfNestedBlock = {
  title: string;
  lines: string[];
  photos?: ExportPdfPhoto[];
  children?: ExportPdfNestedChild[];
};

/** Normalized print document built from any *ExportSnapshot. */
export type ExportPdfDocument = {
  title: string;
  subtitle?: string;
  metaLines?: string[];
  scheduleLine?: string;
  rows?: ExportPdfRow[];
  sections?: ExportPdfSection[];
  photos?: ExportPdfPhoto[];
  listSections?: { title: string; items: ExportPdfListItem[] }[];
  nestedSections?: { title: string; blocks: ExportPdfNestedBlock[] }[];
  exportedAtLabel?: string;
  /** When true, section headings and field labels use the app section-title blue. */
  blueSectionLabels?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectPhotoUris(doc: ExportPdfDocument): string[] {
  const uris: string[] = [];
  const push = (photos?: ExportPdfPhoto[]) => {
    if (!photos) return;
    for (const photo of photos) {
      if (photo.uri) uris.push(photo.uri);
    }
  };
  push(doc.photos);
  for (const section of doc.listSections ?? []) {
    for (const item of section.items) {
      if (item.thumbnailUri) uris.push(item.thumbnailUri);
      push(item.photos);
    }
  }
  for (const section of doc.nestedSections ?? []) {
    for (const block of section.blocks) {
      push(block.photos);
      for (const child of block.children ?? []) {
        push(child.photos);
      }
    }
  }
  return uris;
}

async function buildDataUriMap(uris: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(uris.filter(Boolean))];
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (uri) => {
      const base64 = await readPhotoAsBase64(uri);
      if (base64) {
        map.set(uri, `data:image/jpeg;base64,${base64}`);
      }
    })
  );
  return map;
}

function renderPhotoHtml(
  photo: ExportPdfPhoto,
  dataUris: Map<string, string>
): string {
  const src = dataUris.get(photo.uri);
  const label = escapeHtml(photo.label);
  const notes = photo.notes?.trim() ? escapeHtml(photo.notes.trim()) : '';
  if (!src) {
    return `<div class="photo-missing"><div class="photo-label">${label}</div>${
      notes ? `<div class="photo-notes">${notes}</div>` : ''
    }</div>`;
  }
  if (notes) {
    return `<div class="photo-row">
  <img class="photo" src="${src}" alt="${label}" />
  <div class="photo-aside">
    <div class="photo-label">${label}</div>
    <div class="photo-notes">${notes}</div>
  </div>
</div>`;
  }
  return `<div class="photo-tile">
  <img class="photo" src="${src}" alt="${label}" />
  <div class="photo-label">${label}</div>
</div>`;
}

function renderPhotosBlock(
  title: string,
  photos: ExportPdfPhoto[],
  dataUris: Map<string, string>
): string {
  if (photos.length === 0) return '';
  const body = photos.map((p) => renderPhotoHtml(p, dataUris)).join('\n');
  return `<section class="section">
  <h2>${escapeHtml(title)}</h2>
  <div class="photos">${body}</div>
</section>`;
}

function renderRows(rows: ExportPdfRow[]): string {
  if (rows.length === 0) return '';
  return `<div class="rows">${rows
    .map(
      (r) => `<div class="row"><span class="row-label">${escapeHtml(r.label)}</span>
      <span class="row-value">${escapeHtml(r.value)}</span></div>`
    )
    .join('\n')}</div>`;
}

function renderListItem(item: ExportPdfListItem, dataUris: Map<string, string>): string {
  const thumb = item.thumbnailUri ? dataUris.get(item.thumbnailUri) : undefined;
  const thumbHtml = thumb
    ? `<img class="thumb" src="${thumb}" alt="" />`
    : '';
  const lines = item.lines
    .map((line) => `<div class="muted">${escapeHtml(line)}</div>`)
    .join('\n');
  const photos =
    item.photos && item.photos.length > 0
      ? `<div class="photos nested">${item.photos
          .map((p) => renderPhotoHtml(p, dataUris))
          .join('\n')}</div>`
      : '';
  return `<div class="list-item">
  <div class="list-item-main">${thumbHtml}<div class="list-item-body">
    <div class="list-item-title">${escapeHtml(item.title)}</div>
    ${lines}
  </div></div>
  ${photos}
</div>`;
}

function renderNestedBlock(
  block: ExportPdfNestedBlock,
  dataUris: Map<string, string>
): string {
  const lines = block.lines
    .map((line) => `<div class="muted">${escapeHtml(line)}</div>`)
    .join('\n');
  const photos =
    block.photos && block.photos.length > 0
      ? `<div class="photos nested">${block.photos
          .map((p) => renderPhotoHtml(p, dataUris))
          .join('\n')}</div>`
      : '';
  const children = (block.children ?? [])
    .map((child) => {
      const childLines = child.lines
        .map((line) => `<div class="muted">${escapeHtml(line)}</div>`)
        .join('\n');
      const childPhotos =
        child.photos && child.photos.length > 0
          ? `<div class="photos nested">${child.photos
              .map((p) => renderPhotoHtml(p, dataUris))
              .join('\n')}</div>`
          : '';
      return `<div class="nested-child">
  <div class="list-item-title">${escapeHtml(child.title)}</div>
  ${childLines}
  ${childPhotos}
</div>`;
    })
    .join('\n');
  return `<div class="list-item">
  <div class="list-item-title">${escapeHtml(block.title)}</div>
  ${lines}
  ${photos}
  ${children}
</div>`;
}

const PDF_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1814;
    background: #f7f5f1;
    font-size: 14px;
    line-height: 1.45;
  }
  h1 {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 8px;
    color: #1a1814;
  }
  h2 {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 10px;
    color: #2c2824;
  }
  .subtitle { color: #6b6560; font-size: 13px; margin: 0 0 4px; }
  .meta { color: #6b6560; font-size: 13px; margin: 0 0 2px; }
  .schedule {
    margin-top: 10px;
    padding: 8px 10px;
    background: #efe6d4;
    border-radius: 8px;
    color: #1a1814;
    font-size: 13px;
  }
  .section {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #d4cfc6;
  }
  .rows { margin-top: 4px; }
  .row { margin-bottom: 8px; }
  .row-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #6b6560;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .row-value { display: block; margin-top: 2px; white-space: pre-wrap; }
  .muted { color: #6b6560; font-size: 13px; margin-top: 3px; }
  .photos {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  }
  .photos.nested { margin-top: 10px; }
  .photo {
    max-width: ${PHOTO_MAX_WIDTH_PX}px;
    width: 100%;
    height: auto;
    border-radius: 8px;
    background: #d4cfc6;
    display: block;
  }
  .photo-tile { width: ${PHOTO_MAX_WIDTH_PX}px; max-width: 100%; }
  .photo-row {
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: flex-start;
    width: 100%;
  }
  .photo-row .photo { width: 160px; max-width: 40%; flex-shrink: 0; }
  .photo-aside { flex: 1; min-width: 0; }
  .photo-label { font-size: 11px; color: #6b6560; margin-top: 4px; font-weight: 600; }
  .photo-notes { font-size: 13px; color: #1a1814; margin-top: 4px; white-space: pre-wrap; }
  .photo-missing {
    padding: 12px;
    background: #e8e4dc;
    border-radius: 8px;
    color: #6b6560;
  }
  .list-item {
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #d4cfc6;
  }
  .list-item:last-child { border-bottom: none; }
  .list-item-main { display: flex; flex-direction: row; gap: 12px; align-items: flex-start; }
  .thumb {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 8px;
    background: #d4cfc6;
    flex-shrink: 0;
  }
  .list-item-title { font-size: 15px; font-weight: 700; color: #1a1814; }
  .nested-child {
    margin-top: 10px;
    margin-left: 8px;
    padding-left: 10px;
    border-left: 2px solid #d4cfc6;
  }
  .footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #d4cfc6;
    color: #6b6560;
    font-size: 12px;
  }
  body.blue-section-labels h2,
  body.blue-section-labels .row-label {
    color: #1f5fbf;
  }
`;

export async function buildExportPdfHtml(doc: ExportPdfDocument): Promise<string> {
  const dataUris = await buildDataUriMap(collectPhotoUris(doc));

  const header = [
    doc.subtitle ? `<div class="subtitle">${escapeHtml(doc.subtitle)}</div>` : '',
    `<h1>${escapeHtml(doc.title)}</h1>`,
    ...(doc.metaLines ?? []).map((line) => `<div class="meta">${escapeHtml(line)}</div>`),
    doc.scheduleLine
      ? `<div class="schedule">${escapeHtml(doc.scheduleLine)}</div>`
      : '',
  ].join('\n');

  const rowsHtml =
    doc.rows && doc.rows.length > 0
      ? `<section class="section">${renderRows(doc.rows)}</section>`
      : '';

  const sectionsHtml = (doc.sections ?? [])
    .map(
      (section) => `<section class="section">
  <h2>${escapeHtml(section.title)}</h2>
  ${renderRows(section.rows)}
</section>`
    )
    .join('\n');

  const photosHtml = renderPhotosBlock('Photos', doc.photos ?? [], dataUris);

  const listHtml = (doc.listSections ?? [])
    .filter((section) => section.items.length > 0)
    .map(
      (section) => `<section class="section">
  <h2>${escapeHtml(section.title)}</h2>
  ${section.items.map((item) => renderListItem(item, dataUris)).join('\n')}
</section>`
    )
    .join('\n');

  const nestedHtml = (doc.nestedSections ?? [])
    .filter((section) => section.blocks.length > 0)
    .map(
      (section) => `<section class="section">
  <h2>${escapeHtml(section.title)}</h2>
  ${section.blocks.map((block) => renderNestedBlock(block, dataUris)).join('\n')}
</section>`
    )
    .join('\n');

  const footer = doc.exportedAtLabel
    ? `<div class="footer">${escapeHtml(doc.exportedAtLabel)}</div>`
    : '';

  const bodyClass = doc.blueSectionLabels ? ' class="blue-section-labels"' : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${PDF_CSS}</style>
</head>
<body${bodyClass}>
${header}
${rowsHtml}
${sectionsHtml}
${photosHtml}
${listHtml}
${nestedHtml}
${footer}
</body>
</html>`;
}

export function propertySnapshotToPdfDoc(snapshot: PropertyExportSnapshot): ExportPdfDocument {
  const listSections: NonNullable<ExportPdfDocument['listSections']> = [];
  if (snapshot.services.length > 0) {
    listSections.push({ title: 'Reminders', items: snapshot.services });
  }
  if (snapshot.rooms.length > 0) {
    listSections.push({ title: 'Rooms', items: snapshot.rooms });
  }
  if (snapshot.projects.length > 0) {
    listSections.push({ title: 'Projects', items: snapshot.projects });
  }
  if (snapshot.todos.length > 0) {
    listSections.push({ title: 'To do', items: snapshot.todos });
  }
  if (snapshot.ideas.length > 0) {
    listSections.push({ title: 'Ideas', items: snapshot.ideas });
  }
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    photos: snapshot.photos,
    listSections,
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function projectSnapshotToPdfDoc(snapshot: ProjectExportSnapshot): ExportPdfDocument {
  const listSections: NonNullable<ExportPdfDocument['listSections']> = [];
  if (snapshot.punchItems.length > 0) {
    listSections.push({ title: 'Punch list', items: snapshot.punchItems });
  }
  if (snapshot.recentInteractions.length > 0) {
    listSections.push({ title: 'Recent interactions', items: snapshot.recentInteractions });
  }
  const nestedSections: NonNullable<ExportPdfDocument['nestedSections']> = [];
  if (snapshot.vendors.length > 0) {
    nestedSections.push({
      title: 'Vendors',
      blocks: snapshot.vendors.map((vendor) => ({
        title: vendor.title,
        lines: vendor.lines,
        photos: vendor.photos,
        children: vendor.interactions.map((interaction) => ({
          title: interaction.date,
          lines: [interaction.detail].filter(Boolean),
          photos: interaction.photos,
        })),
      })),
    });
  }
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    sections: snapshot.sections,
    photos: snapshot.photos,
    listSections,
    nestedSections,
    exportedAtLabel: snapshot.exportedAtLabel,
    blueSectionLabels: true,
  };
}

export function itemSnapshotToPdfDoc(snapshot: ItemExportSnapshot): ExportPdfDocument {
  const nestedSections: NonNullable<ExportPdfDocument['nestedSections']> = [];
  if (snapshot.events.length > 0) {
    nestedSections.push({
      title: 'Service history',
      blocks: snapshot.events.map((event) => ({
        title: event.title,
        lines: event.lines,
        photos: event.photos,
      })),
    });
  }
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    sections: snapshot.sections,
    photos: snapshot.photos,
    nestedSections,
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function eventSnapshotToPdfDoc(snapshot: EventExportSnapshot): ExportPdfDocument {
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    scheduleLine: snapshot.scheduleLine,
    rows: snapshot.rows,
    photos: snapshot.photos,
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function vendorSnapshotToPdfDoc(snapshot: VendorExportSnapshot): ExportPdfDocument {
  const nestedSections: NonNullable<ExportPdfDocument['nestedSections']> = [];
  if (snapshot.interactions.length > 0) {
    nestedSections.push({
      title: 'Interactions',
      blocks: snapshot.interactions.map((interaction) => ({
        title: interaction.title,
        lines: interaction.lines,
        photos: interaction.photos,
      })),
    });
  }
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    sections: snapshot.sections,
    photos: snapshot.photos,
    nestedSections,
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function interactionSnapshotToPdfDoc(
  snapshot: InteractionExportSnapshot
): ExportPdfDocument {
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    rows: snapshot.rows,
    photos: snapshot.photos,
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function assetsSnapshotToPdfDoc(snapshot: AssetsExportSnapshot): ExportPdfDocument {
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    listSections: [
      {
        title: 'Assets',
        items: snapshot.assets.map((asset) => ({
          title: asset.title,
          lines: asset.lines,
          photos: asset.photos,
        })),
      },
    ],
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function servicesSnapshotToPdfDoc(snapshot: ServicesExportSnapshot): ExportPdfDocument {
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    listSections: [
      {
        title: 'Services',
        items: snapshot.services.map((service) => ({
          title: service.title,
          lines: service.lines,
          photos: service.photos,
        })),
      },
    ],
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}

export function interactionsSnapshotToPdfDoc(
  snapshot: InteractionsExportSnapshot
): ExportPdfDocument {
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    metaLines: snapshot.metaLines,
    listSections: [
      {
        title: 'Interactions',
        items: snapshot.interactions.map((interaction) => ({
          title: interaction.title,
          lines: interaction.lines,
          photos: interaction.photos,
        })),
      },
    ],
    exportedAtLabel: snapshot.exportedAtLabel,
  };
}
