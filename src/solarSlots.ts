import type { SolarDetails } from './types';

export type SolarPhotoSlotKey =
  | 'panelsPhotoId'
  | 'inverterPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const SOLAR_PHOTO_SLOTS: {
  key: SolarPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'panelsPhotoId',
    label: 'Panels',
    hint: 'Photo of the solar panel array',
    shortLabel: 'Panels',
  },
  {
    key: 'inverterPhotoId',
    label: 'Inverter',
    hint: 'Photo of the inverter',
    shortLabel: 'Inverter',
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

export function solarHasSystemInfo(details: SolarDetails): boolean {
  return Boolean(
    details.systemSizeKw?.trim() ||
      details.panelMake?.trim() ||
      details.panelModel?.trim() ||
      details.panelCount?.trim()
  );
}

export function solarHasInverterInfo(details: SolarDetails): boolean {
  return Boolean(
    details.inverterMake?.trim() ||
      details.inverterModel?.trim() ||
      details.inverterSerialNumber?.trim()
  );
}

export function solarHasProductionInfo(details: SolarDetails): boolean {
  return Boolean(details.productionAccountNotes?.trim());
}

export function solarHasInstallInfo(details: SolarDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim() ||
      details.warrantyNotes?.trim()
  );
}
