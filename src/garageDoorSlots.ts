import type { GarageDoorDetails } from './types';

export type GarageDoorPhotoSlotKey =
  | 'doorPhotoId'
  | 'openerPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const GARAGE_DOOR_PHOTO_SLOTS: {
  key: GarageDoorPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'doorPhotoId',
    label: 'Door',
    hint: 'Photo of the garage door',
    shortLabel: 'Door',
  },
  {
    key: 'openerPhotoId',
    label: 'Opener',
    hint: 'Photo of the garage door opener',
    shortLabel: 'Opener',
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

export function garageDoorHasEquipmentInfo(details: GarageDoorDetails): boolean {
  return Boolean(
    details.openerMake?.trim() ||
      details.openerModel?.trim() ||
      details.openerSerialNumber?.trim() ||
      details.springType?.trim() ||
      details.programmingNotes?.trim()
  );
}

export function garageDoorHasInstallInfo(details: GarageDoorDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function garageDoorHasServiceInfo(details: GarageDoorDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
