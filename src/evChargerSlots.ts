import type { EvChargerDetails } from './types';

export type EvChargerPhotoSlotKey =
  | 'chargerPhotoId'
  | 'breakerPanelPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const EV_CHARGER_PHOTO_SLOTS: {
  key: EvChargerPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'chargerPhotoId',
    label: 'Charger',
    hint: 'Photo of the EV charger',
    shortLabel: 'Charger',
  },
  {
    key: 'breakerPanelPhotoId',
    label: 'Breaker panel',
    hint: 'Photo of the dedicated breaker',
    shortLabel: 'Breaker panel',
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

export function evChargerHasEquipmentInfo(details: EvChargerDetails): boolean {
  return Boolean(
    details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      details.amperage?.trim() ||
      details.connectorType?.trim() ||
      details.circuitBreaker?.trim()
  );
}

export function evChargerHasInstallInfo(details: EvChargerDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}
