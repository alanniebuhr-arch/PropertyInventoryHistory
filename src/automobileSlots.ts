import type { AutomobileDetails } from './types';

export type AutomobilePhotoSlotKey =
  | 'vehiclePhotoId'
  | 'vinTagPhotoId'
  | 'titlePhotoId'
  | 'registrationPhotoId'
  | 'insuranceCardPhotoId'
  | 'windowStickerPhotoId'
  | 'purchaseReceiptPhotoId';

export const AUTOMOBILE_PHOTO_SLOTS: {
  key: AutomobilePhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'vehiclePhotoId',
    label: 'Vehicle',
    hint: 'Photo of the automobile',
    shortLabel: 'Vehicle',
  },
  {
    key: 'vinTagPhotoId',
    label: 'VIN tag',
    hint: 'Door jamb sticker with VIN and build info',
    shortLabel: 'VIN tag',
  },
  {
    key: 'titlePhotoId',
    label: 'Title',
    hint: 'Photo of the vehicle title',
    shortLabel: 'Title',
  },
  {
    key: 'registrationPhotoId',
    label: 'Registration',
    hint: 'Photo of the vehicle registration',
    shortLabel: 'Registration',
  },
  {
    key: 'insuranceCardPhotoId',
    label: 'Insurance card',
    hint: 'Photo of the insurance card or proof of insurance',
    shortLabel: 'Insurance',
  },
  {
    key: 'windowStickerPhotoId',
    label: 'Window sticker',
    hint: 'Photo of the Monroney window sticker or build sheet',
    shortLabel: 'Sticker',
  },
  {
    key: 'purchaseReceiptPhotoId',
    label: 'Purchase receipt',
    hint: 'Photo of the bill of sale or purchase receipt',
    shortLabel: 'Receipt',
  },
];

export function automobileDescription(details: AutomobileDetails): string | undefined {
  const parts = [details.year, details.make, details.model, details.trim]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function automobileHasVehicleInfo(details: AutomobileDetails): boolean {
  return Boolean(
    details.nickname?.trim() ||
      details.year?.trim() ||
      details.make?.trim() ||
      details.model?.trim() ||
      details.trim?.trim() ||
      details.vin?.trim() ||
      details.licensePlate?.trim() ||
      details.color?.trim()
  );
}

export function automobileHasPurchaseInfo(details: AutomobileDetails): boolean {
  return Boolean(
    details.purchaseDateAtISO?.trim() ||
      details.purchasePrice?.trim() ||
      details.purchaseLocation?.trim() ||
      details.purchaseMileage?.trim()
  );
}

export function automobileHasMaintenanceInfo(details: AutomobileDetails): boolean {
  return Boolean(
    details.currentMileage?.trim() ||
      details.oilType?.trim() ||
      details.oilFilter?.trim() ||
      details.tireSize?.trim()
  );
}

export function automobileHasServiceInfo(details: AutomobileDetails): boolean {
  return Boolean(
    details.serviceCompany?.trim() ||
      details.servicePhone?.trim() ||
      details.insuranceCompany?.trim() ||
      details.insurancePhone?.trim() ||
      details.insurancePolicyNumber?.trim()
  );
}
