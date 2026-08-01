import type { GeneratorDetails, GeneratorFuelType } from './types';

export type GeneratorPhotoSlotKey =
  | 'generatorPhotoId'
  | 'transferSwitchPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const GENERATOR_FUEL_TYPE_OPTIONS: { value: GeneratorFuelType; label: string }[] = [
  { value: 'propane', label: 'Propane' },
  { value: 'natural_gas', label: 'Natural gas' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'other', label: 'Other' },
];

export const GENERATOR_PHOTO_SLOTS: {
  key: GeneratorPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'generatorPhotoId',
    label: 'Generator',
    hint: 'Photo of the generator',
    shortLabel: 'Generator',
  },
  {
    key: 'transferSwitchPhotoId',
    label: 'Transfer switch',
    hint: 'Photo of the automatic/manual transfer switch',
    shortLabel: 'Transfer switch',
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

export function generatorFuelTypeLabel(
  fuelType?: GeneratorFuelType,
  fuelTypeOther?: string
): string | undefined {
  if (!fuelType) return undefined;
  if (fuelType === 'other') {
    const custom = fuelTypeOther?.trim();
    return custom || 'Other';
  }
  return GENERATOR_FUEL_TYPE_OPTIONS.find((o) => o.value === fuelType)?.label ?? fuelType;
}

export function normalizeGeneratorFuelType(raw?: string): GeneratorFuelType | undefined {
  if (
    raw === 'propane' ||
    raw === 'natural_gas' ||
    raw === 'diesel' ||
    raw === 'gasoline' ||
    raw === 'other'
  ) {
    return raw;
  }
  return undefined;
}

export function generatorHasEquipmentInfo(details: GeneratorDetails): boolean {
  return Boolean(
    generatorFuelTypeLabel(details.fuelType, details.fuelTypeOther) ||
      details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      details.wattage?.trim() ||
      details.transferSwitchLocation?.trim()
  );
}

export function generatorHasExerciseInfo(details: GeneratorDetails): boolean {
  return Boolean(details.runtimeHours?.trim() || details.lastExerciseAtISO?.trim());
}

export function generatorHasInstallInfo(details: GeneratorDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function generatorHasServiceInfo(details: GeneratorDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
