import type { RoofDetails, RoofMaterial } from './types';

export type RoofPhotoSlotKey = 'overviewPhotoId' | 'detailPhotoId' | 'receiptPhotoId';

export const ROOF_MATERIAL_OPTIONS: { value: RoofMaterial; label: string }[] = [
  { value: 'asphalt', label: 'Asphalt shingle' },
  { value: 'metal', label: 'Metal' },
  { value: 'slate', label: 'Slate' },
  { value: 'tile', label: 'Tile' },
  { value: 'other', label: 'Other' },
];

export const ROOF_PHOTO_SLOTS: {
  key: RoofPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'overviewPhotoId',
    label: 'Overview',
    hint: 'Photo of the whole roof',
    shortLabel: 'Overview',
  },
  {
    key: 'detailPhotoId',
    label: 'Detail',
    hint: 'Close-up of shingles, flashing, or a problem area',
    shortLabel: 'Detail',
  },
  {
    key: 'receiptPhotoId',
    label: 'Invoice/Receipt',
    hint: 'Photo of the install invoice or receipt',
    shortLabel: 'Invoice/Receipt',
  },
];

export function roofMaterialLabel(
  material?: RoofMaterial,
  materialOther?: string
): string | undefined {
  if (!material) return undefined;
  if (material === 'other') {
    const custom = materialOther?.trim();
    return custom || 'Other';
  }
  return ROOF_MATERIAL_OPTIONS.find((o) => o.value === material)?.label ?? material;
}

export function normalizeRoofMaterial(raw?: string): RoofMaterial | undefined {
  if (raw === 'asphalt' || raw === 'metal' || raw === 'slate' || raw === 'tile' || raw === 'other') {
    return raw;
  }
  return undefined;
}

export function roofHasRoofInfo(details: RoofDetails): boolean {
  return Boolean(roofMaterialLabel(details.material, details.materialOther) || details.color?.trim());
}

export function roofHasWarrantyInfo(details: RoofDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.warrantyExpiresAtISO?.trim() ||
      details.lastInspectedAtISO?.trim()
  );
}

export function roofHasContractorInfo(details: RoofDetails): boolean {
  return Boolean(details.contractorName?.trim() || details.contractorPhone?.trim());
}
