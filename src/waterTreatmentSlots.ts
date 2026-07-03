import type { WaterTreatmentDetails } from './types';

export type WaterTreatmentPhotoSlotKey =
  | 'waterFilterPhotoId'
  | 'replacementFilterPhotoId'
  | 'receiptPhotoId';

export const WATER_TREATMENT_PHOTO_SLOTS: {
  key: WaterTreatmentPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'waterFilterPhotoId',
    label: 'Water Filter',
    hint: 'Photo of the water filter',
    shortLabel: 'Water Filter',
  },
  {
    key: 'replacementFilterPhotoId',
    label: 'Replacement filter',
    hint: 'Photo of the replacement filter',
    shortLabel: 'Replacement filter',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export function waterTreatmentHasInfo(details: WaterTreatmentDetails): boolean {
  return Boolean(
    details.systemType?.trim() || details.filterName?.trim() || details.notes?.trim()
  );
}
