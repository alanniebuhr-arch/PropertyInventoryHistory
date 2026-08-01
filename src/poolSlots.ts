import type { PoolDetails, PoolType } from './types';

export type PoolPhotoSlotKey =
  | 'overviewPhotoId'
  | 'equipmentPadPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const POOL_TYPE_OPTIONS: { value: PoolType; label: string }[] = [
  { value: 'in_ground', label: 'In-ground' },
  { value: 'above_ground', label: 'Above-ground' },
  { value: 'other', label: 'Other' },
];

export const POOL_PHOTO_SLOTS: {
  key: PoolPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'overviewPhotoId',
    label: 'Overview',
    hint: 'Photo of the pool',
    shortLabel: 'Overview',
  },
  {
    key: 'equipmentPadPhotoId',
    label: 'Equipment pad',
    hint: 'Photo of the filter/pump/heater equipment pad',
    shortLabel: 'Equipment pad',
  },
  {
    key: 'manufacturerTagPhotoId',
    label: 'Manufacture tag',
    hint: 'Model and serial number sticker or plate',
    shortLabel: 'Manufacture tag',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export function poolTypeLabel(poolType?: PoolType, poolTypeOther?: string): string | undefined {
  if (!poolType) return undefined;
  if (poolType === 'other') {
    const custom = poolTypeOther?.trim();
    return custom || 'Other';
  }
  return POOL_TYPE_OPTIONS.find((o) => o.value === poolType)?.label ?? poolType;
}

export function normalizePoolType(raw?: string): PoolType | undefined {
  if (raw === 'in_ground' || raw === 'above_ground' || raw === 'other') return raw;
  return undefined;
}

export function poolHasPoolInfo(details: PoolDetails): boolean {
  return Boolean(poolTypeLabel(details.poolType, details.poolTypeOther) || details.volumeGallons?.trim());
}

export function poolHasEquipmentInfo(details: PoolDetails): boolean {
  return Boolean(
    details.filterMake?.trim() ||
      details.filterModel?.trim() ||
      details.pumpMake?.trim() ||
      details.pumpModel?.trim() ||
      details.heaterType?.trim() ||
      details.chemicalNotes?.trim()
  );
}

export function poolHasInstallInfo(details: PoolDetails): boolean {
  return Boolean(details.installDateAtISO?.trim());
}

export function poolHasServiceInfo(details: PoolDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
