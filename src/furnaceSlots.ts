import type { FuelType, FurnaceDetails, HeatDistributionType, HeatingSystemType } from './types';

export type FurnacePhotoSlotKey =
  | 'systemFrontPhotoId'
  | 'systemSidePhotoId'
  | 'systemTagPhotoId'
  | 'fuelShutoffPhotoId'
  | 'fuelTankPhotoId'
  | 'receiptPhotoId';

export function furnaceUsesFuelTank(fuelType?: FuelType): boolean {
  return fuelType === 'oil' || fuelType === 'propane';
}

export function furnaceUsesFuelShutoff(fuelType?: FuelType): boolean {
  return fuelType === 'natural_gas' || fuelType === 'propane';
}

export function fuelShutoffSlotLabel(fuelType?: FuelType): string {
  if (fuelType === 'natural_gas') return 'Natural gas Shutoff';
  if (fuelType === 'propane') return 'Propane Shutoff';
  return 'Fuel shutoff';
}

export function fuelTankSlotLabel(fuelType?: FuelType): string {
  if (fuelType === 'oil') return 'Oil tank';
  if (fuelType === 'propane') return 'Propane tank';
  return 'Fuel tank';
}

export function fuelTankLocationLabel(fuelType?: FuelType): string {
  if (fuelType === 'oil') return 'Oil tank location';
  if (fuelType === 'propane') return 'Propane tank location';
  return 'Tank location';
}

export function fuelTankSizeLabel(fuelType?: FuelType): string {
  if (fuelType === 'oil') return 'Oil tank size';
  if (fuelType === 'propane') return 'Propane tank size';
  return 'Tank size';
}

export const FUEL_TYPE_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'natural_gas', label: 'Natural gas' },
  { value: 'propane', label: 'Propane' },
  { value: 'electric', label: 'Electric' },
  { value: 'oil', label: 'Oil' },
  { value: 'other', label: 'Other' },
];

export const HEAT_SOURCE_OPTIONS: { value: HeatingSystemType; label: string }[] = [
  { value: 'furnace', label: 'Furnace' },
  { value: 'boiler', label: 'Boiler' },
  { value: 'heat_pump', label: 'Heat pump' },
];

export const HEAT_DISTRIBUTION_OPTIONS: { value: HeatDistributionType; label: string }[] = [
  { value: 'forced_air', label: 'Forced air' },
  { value: 'baseboard', label: 'Baseboard' },
  { value: 'radiators', label: 'Radiators' },
  { value: 'other', label: 'Other' },
];

export function fuelTypeLabel(
  fuelType?: FuelType,
  fuelTypeOther?: string
): string | undefined {
  if (!fuelType) return undefined;
  if (fuelType === 'other') {
    const custom = fuelTypeOther?.trim();
    return custom || 'Other';
  }
  return FUEL_TYPE_OPTIONS.find((o) => o.value === fuelType)?.label ?? fuelType;
}

export function heatSourceLabel(systemType?: HeatingSystemType): string {
  return HEAT_SOURCE_OPTIONS.find((o) => o.value === systemType)?.label ?? 'System';
}

export function heatSourceTagSlotLabel(systemType?: HeatingSystemType): string {
  return `${heatSourceLabel(systemType)} tag`;
}

export function heatDistributionLabel(
  heatDistribution?: HeatDistributionType,
  heatDistributionOther?: string
): string | undefined {
  if (!heatDistribution) return undefined;
  if (heatDistribution === 'other') {
    const custom = heatDistributionOther?.trim();
    return custom || 'Other';
  }
  return HEAT_DISTRIBUTION_OPTIONS.find((o) => o.value === heatDistribution)?.label ?? heatDistribution;
}

export function normalizeFuelType(raw?: string): FuelType | undefined {
  const v = raw?.trim().toLowerCase().replace(/\s+/g, '_');
  if (v === 'gas' || v === 'natural_gas' || v === 'natural') return 'natural_gas';
  if (v === 'propane' || v === 'lp' || v === 'lpg') return 'propane';
  if (v === 'electric') return 'electric';
  if (v === 'oil') return 'oil';
  if (v === 'other') return 'other';
  return undefined;
}

export function normalizeHeatDistribution(raw?: string): HeatDistributionType | undefined {
  const v = raw?.trim().toLowerCase().replace(/\s+/g, '_');
  if (v === 'forced_air' || v === 'forcedair') return 'forced_air';
  if (v === 'baseboard') return 'baseboard';
  if (v === 'radiators' || v === 'radiator') return 'radiators';
  if (v === 'other') return 'other';
  return undefined;
}

export function furnacePhotoSlotsForDetails(details: FurnaceDetails): {
  key: FurnacePhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] {
  if (!details.systemType) return [];
  const name = heatSourceLabel(details.systemType);
  const slots: {
    key: FurnacePhotoSlotKey;
    label: string;
    hint: string;
    shortLabel: string;
  }[] = [
    {
      key: 'systemFrontPhotoId',
      label: `${name} front`,
      hint: `Photo of the front of the ${name.toLowerCase()}`,
      shortLabel: `${name} front`,
    },
    {
      key: 'systemSidePhotoId',
      label: `${name} side`,
      hint: `Photo of the side of the ${name.toLowerCase()}`,
      shortLabel: `${name} side`,
    },
    {
      key: 'systemTagPhotoId',
      label: heatSourceTagSlotLabel(details.systemType),
      hint: 'Model and serial number sticker or plate',
      shortLabel: heatSourceTagSlotLabel(details.systemType),
    },
  ];
  if (furnaceUsesFuelShutoff(details.fuelType)) {
    const shutoffLabel = fuelShutoffSlotLabel(details.fuelType);
    slots.push({
      key: 'fuelShutoffPhotoId',
      label: shutoffLabel,
      hint: `Photo of the ${shutoffLabel.toLowerCase()}`,
      shortLabel: shutoffLabel,
    });
  }
  if (furnaceUsesFuelTank(details.fuelType)) {
    const tankLabel = fuelTankSlotLabel(details.fuelType);
    slots.push({
      key: 'fuelTankPhotoId',
      label: tankLabel,
      hint: `Photo of the ${tankLabel.toLowerCase()}`,
      shortLabel: tankLabel,
    });
  }
  slots.push({
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  });
  return slots;
}

export function furnaceHasEquipmentInfo(details: FurnaceDetails): boolean {
  return Boolean(
    details.systemType ||
      details.heatDistribution ||
      details.fuelType ||
      details.make?.trim() ||
      details.modelNumber?.trim() ||
      details.serialNumber?.trim() ||
      details.filterSize?.trim() ||
      details.fuelTankLocation?.trim() ||
      details.fuelTankSize?.trim()
  );
}

export function furnaceHasInstallInfo(details: FurnaceDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installCost?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}
