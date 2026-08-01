import type { WaterHeaterDetails } from './types';
import { fuelTypeLabel } from './furnaceSlots';

export type WaterHeaterPhotoSlotKey =
  | 'frontPhotoId'
  | 'distancePhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const WATER_HEATER_PHOTO_SLOTS: {
  key: WaterHeaterPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'frontPhotoId',
    label: 'Front',
    hint: 'Photo of the front of the water heater',
    shortLabel: 'Front',
  },
  {
    key: 'distancePhotoId',
    label: 'From distance',
    hint: 'Photo of the water heater from a few feet away',
    shortLabel: 'From distance',
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

export function waterHeaterHasInfo(details: WaterHeaterDetails): boolean {
  return Boolean(
    fuelTypeLabel(details.fuelType, details.fuelTypeOther) ||
      details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      details.notes?.trim()
  );
}
