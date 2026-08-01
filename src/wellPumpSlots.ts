import type { WellPumpDetails } from './types';

export type WellPumpPhotoSlotKey =
  | 'pumpPhotoId'
  | 'pressureTankPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const WELL_PUMP_PHOTO_SLOTS: {
  key: WellPumpPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'pumpPhotoId',
    label: 'Pump',
    hint: 'Photo of the well pump',
    shortLabel: 'Pump',
  },
  {
    key: 'pressureTankPhotoId',
    label: 'Pressure tank',
    hint: 'Photo of the pressure tank',
    shortLabel: 'Pressure tank',
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

export function wellPumpHasWellInfo(details: WellPumpDetails): boolean {
  return Boolean(
    details.wellDepth?.trim() ||
      details.yieldGpm?.trim() ||
      details.pressureTankSize?.trim() ||
      details.locationNotes?.trim()
  );
}

export function wellPumpHasEquipmentInfo(details: WellPumpDetails): boolean {
  return Boolean(
    details.pumpMake?.trim() || details.pumpModel?.trim() || details.pumpSerialNumber?.trim()
  );
}

export function wellPumpHasInstallInfo(details: WellPumpDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function wellPumpHasServiceInfo(details: WellPumpDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
