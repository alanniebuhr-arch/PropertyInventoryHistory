import type { ApplianceDetails } from './types';

export type AppliancePhotoSlotKey =
  | 'facePhotoId'
  | 'manufacturerTagPhotoId'
  | 'insidePhotoId'
  | 'purchaseReceiptPhotoId';

export const APPLIANCE_PHOTO_SLOTS: {
  key: AppliancePhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'facePhotoId',
    label: 'Appliance front',
    hint: 'Photo of the front of the appliance',
    shortLabel: 'Front',
  },
  {
    key: 'manufacturerTagPhotoId',
    label: 'Manufacturer tag',
    hint: 'Model and serial number sticker or plate',
    shortLabel: 'Tag',
  },
  {
    key: 'insidePhotoId',
    label: 'Appliance inside',
    hint: 'Interior view (e.g. oven cavity, drum, shelves)',
    shortLabel: 'Inside',
  },
  {
    key: 'purchaseReceiptPhotoId',
    label: 'Purchase receipt',
    hint: 'Photo of the original purchase receipt',
    shortLabel: 'Receipt',
  },
];

/** Label for optional appliance photos added outside the named slots. */
export const APPLIANCE_EXTRA_PHOTOS_SHORT_LABEL = 'Your photo';

export function applianceHasIdentityInfo(details: ApplianceDetails): boolean {
  return Boolean(
    details.nickname?.trim() ||
      details.manufacturer?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim()
  );
}

export function applianceHasPurchaseInfo(details: ApplianceDetails): boolean {
  return Boolean(
    details.purchaseLocation?.trim() ||
      details.purchaseDateAtISO?.trim() ||
      details.purchasePrice?.trim()
  );
}

export function applianceHasRepairInfo(details: ApplianceDetails): boolean {
  return Boolean(
    details.repairCompany?.trim() ||
      details.repairPhone?.trim() ||
      details.repairWebsite?.trim()
  );
}
