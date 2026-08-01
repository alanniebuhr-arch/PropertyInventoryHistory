import type { HotTubDetails } from './types';

export type HotTubPhotoSlotKey =
  | 'overviewPhotoId'
  | 'equipmentPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const HOT_TUB_PHOTO_SLOTS: {
  key: HotTubPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'overviewPhotoId',
    label: 'Overview',
    hint: 'Photo of the hot tub',
    shortLabel: 'Overview',
  },
  {
    key: 'equipmentPhotoId',
    label: 'Equipment',
    hint: 'Photo of the equipment/access panel',
    shortLabel: 'Equipment',
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

export function hotTubHasEquipmentInfo(details: HotTubDetails): boolean {
  return Boolean(
    details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      details.capacityPersons?.trim()
  );
}

export function hotTubHasMaintenanceInfo(details: HotTubDetails): boolean {
  return Boolean(
    details.filterModel?.trim() || details.heaterType?.trim() || details.chemicalNotes?.trim()
  );
}

export function hotTubHasInstallInfo(details: HotTubDetails): boolean {
  return Boolean(details.installDateAtISO?.trim());
}

export function hotTubHasServiceInfo(details: HotTubDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
