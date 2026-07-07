import type { AcType, AirConditionerDetails } from './types';

export type AirConditionerPhotoSlotKey =
  | 'acUnitPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const AC_TYPE_OPTIONS: { value: AcType; label: string }[] = [
  { value: 'condenser', label: 'Condenser' },
  { value: 'heat_pump', label: 'Heat pump' },
  { value: 'window_unit', label: 'Window unit' },
];

export const AIR_CONDITIONER_PHOTO_SLOTS: {
  key: AirConditionerPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'acUnitPhotoId',
    label: 'AC unit',
    hint: 'Photo of the air conditioning unit',
    shortLabel: 'AC unit',
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

export function acTypeLabel(acType?: AcType): string | undefined {
  if (!acType) return undefined;
  return AC_TYPE_OPTIONS.find((o) => o.value === acType)?.label ?? acType;
}

export function airConditionerHasEquipmentInfo(details: AirConditionerDetails): boolean {
  return Boolean(
    details.acType ||
      details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      details.tonnage?.trim() ||
      details.refrigerantType?.trim() ||
      details.filterSize?.trim() ||
      details.locationNotes?.trim()
  );
}

export function airConditionerHasInstallInfo(details: AirConditionerDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installCost?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function airConditionerHasServiceInfo(details: AirConditionerDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
