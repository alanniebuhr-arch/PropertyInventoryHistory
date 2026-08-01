import type { RadonMitigationDetails, RadonMitigationSystemType } from './types';

export type RadonMitigationPhotoSlotKey =
  | 'fanPhotoId'
  | 'manometerPhotoId'
  | 'dischargePhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const RADON_MITIGATION_SYSTEM_TYPE_OPTIONS: {
  value: RadonMitigationSystemType;
  label: string;
}[] = [
  { value: 'sub_slab_suction', label: 'Sub-slab suction' },
  { value: 'crawl_space', label: 'Crawl space' },
  { value: 'block_wall', label: 'Block wall' },
  { value: 'drain_tile', label: 'Drain tile' },
  { value: 'other', label: 'Other' },
];

export const RADON_MITIGATION_PHOTO_SLOTS: {
  key: RadonMitigationPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'fanPhotoId',
    label: 'Fan',
    hint: 'Photo of the radon mitigation fan',
    shortLabel: 'Fan',
  },
  {
    key: 'manometerPhotoId',
    label: 'Manometer',
    hint: 'Photo of the U-tube or digital manometer',
    shortLabel: 'Manometer',
  },
  {
    key: 'dischargePhotoId',
    label: 'Discharge',
    hint: 'Photo of the exterior discharge pipe',
    shortLabel: 'Discharge',
  },
  {
    key: 'manufacturerTagPhotoId',
    label: 'Manufacture tag',
    hint: 'Model and serial number sticker or plate on the fan',
    shortLabel: 'Manufacture tag',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export function radonMitigationSystemTypeLabel(
  systemType?: RadonMitigationSystemType,
  systemTypeOther?: string
): string | undefined {
  if (!systemType) return undefined;
  if (systemType === 'other') {
    const custom = systemTypeOther?.trim();
    return custom || 'Other';
  }
  return (
    RADON_MITIGATION_SYSTEM_TYPE_OPTIONS.find((o) => o.value === systemType)?.label ?? systemType
  );
}

export function normalizeRadonMitigationSystemType(
  raw?: string
): RadonMitigationSystemType | undefined {
  if (
    raw === 'sub_slab_suction' ||
    raw === 'crawl_space' ||
    raw === 'block_wall' ||
    raw === 'drain_tile' ||
    raw === 'other'
  ) {
    return raw;
  }
  return undefined;
}

export function radonMitigationHasSystemInfo(details: RadonMitigationDetails): boolean {
  return Boolean(
    radonMitigationSystemTypeLabel(details.systemType, details.systemTypeOther) ||
      details.fanLocation?.trim() ||
      details.suctionPointLocation?.trim() ||
      details.dischargeLocation?.trim() ||
      details.manometerReading?.trim()
  );
}

export function radonMitigationHasEquipmentInfo(details: RadonMitigationDetails): boolean {
  return Boolean(
    details.fanMake?.trim() || details.fanModel?.trim() || details.fanSerialNumber?.trim()
  );
}

export function radonMitigationHasTestInfo(details: RadonMitigationDetails): boolean {
  return Boolean(details.lastTestDateAtISO?.trim() || details.lastTestResult?.trim());
}

export function radonMitigationHasInstallInfo(details: RadonMitigationDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function radonMitigationHasServiceInfo(details: RadonMitigationDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
