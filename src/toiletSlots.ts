import type { ToiletDetails, ToiletFlushType } from './types';

export type ToiletPhotoSlotKey =
  | 'frontPhotoId'
  | 'manufacturerTagPhotoId'
  | 'flushValvePhotoId'
  | 'fillValvePhotoId'
  | 'receiptPhotoId';

export const TOILET_PHOTO_SLOTS: {
  key: ToiletPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'frontPhotoId',
    label: 'Front',
    hint: 'Photo of the toilet',
    shortLabel: 'Front',
  },
  {
    key: 'manufacturerTagPhotoId',
    label: 'Manufacture tag',
    hint: 'Model and serial number sticker or plate',
    shortLabel: 'Manufacture tag',
  },
  {
    key: 'flushValvePhotoId',
    label: 'Flush valve',
    hint: 'Photo of the flush valve / flapper kit',
    shortLabel: 'Flush valve',
  },
  {
    key: 'fillValvePhotoId',
    label: 'Fill valve',
    hint: 'Photo of the fill valve kit',
    shortLabel: 'Fill valve',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export const TOILET_FLUSH_TYPE_OPTIONS: { value: ToiletFlushType; label: string }[] = [
  { value: 'gravity', label: 'Gravity' },
  { value: 'pressure_assist', label: 'Pressure assist' },
  { value: 'dual_flush', label: 'Dual flush' },
  { value: 'other', label: 'Other' },
];

export function normalizeToiletFlushType(
  value: string | undefined
): ToiletFlushType | undefined {
  if (
    value === 'gravity' ||
    value === 'pressure_assist' ||
    value === 'dual_flush' ||
    value === 'other'
  ) {
    return value;
  }
  return undefined;
}

export function toiletFlushTypeLabel(
  flushType?: ToiletFlushType,
  flushTypeOther?: string
): string | undefined {
  if (!flushType) return undefined;
  if (flushType === 'other') {
    const other = flushTypeOther?.trim();
    return other || 'Other';
  }
  return TOILET_FLUSH_TYPE_OPTIONS.find((opt) => opt.value === flushType)?.label;
}

export function toiletHasEquipmentInfo(details: ToiletDetails): boolean {
  return Boolean(
    details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      toiletFlushTypeLabel(details.flushType, details.flushTypeOther) ||
      details.gallonsPerFlush?.trim()
  );
}

export function toiletHasValvesInfo(details: ToiletDetails): boolean {
  return Boolean(details.flushValveKit?.trim() || details.fillValveKit?.trim());
}

export function toiletHasInstallInfo(details: ToiletDetails): boolean {
  return Boolean(details.installDateAtISO?.trim());
}
