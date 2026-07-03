import type { WasteWaterDetails, WasteWaterSystemType } from './types';

export type WasteWaterPhotoSlotKey =
  | 'wasteLineExitPhotoId'
  | 'sewerBillPhotoId'
  | 'tankLocationPhotoId'
  | 'septicFieldPhotoId';

const WASTE_LINE_EXIT_SLOT = {
  key: 'wasteLineExitPhotoId' as const,
  label: 'Waste line exit',
  hint: 'Photo of where the waste line exits the building',
  shortLabel: 'Waste line exit',
};

const SEWER_BILL_SLOT = {
  key: 'sewerBillPhotoId' as const,
  label: 'Sewer bill',
  hint: 'Photo of a recent sewer bill',
  shortLabel: 'Sewer bill',
};

const TANK_LOCATION_SLOT = {
  key: 'tankLocationPhotoId' as const,
  label: 'Septic/Cesspool tank location',
  hint: 'Photo showing where the septic or cesspool tank is located',
  shortLabel: 'Tank location',
};

const SEPTIC_FIELD_SLOT = {
  key: 'septicFieldPhotoId' as const,
  label: 'Septic field',
  hint: 'Photo of the septic drain field',
  shortLabel: 'Septic field',
};

export const WASTE_WATER_SYSTEM_OPTIONS: { value: WasteWaterSystemType; label: string }[] = [
  { value: 'sewer', label: 'Sewer' },
  { value: 'septic', label: 'Septic' },
  { value: 'cesspool', label: 'Cesspool' },
  { value: 'other', label: 'Other' },
];

export function wasteWaterSystemLabel(
  system?: WasteWaterSystemType,
  systemOther?: string
): string | undefined {
  if (!system) return undefined;
  if (system === 'other') {
    const custom = systemOther?.trim();
    return custom || 'Other';
  }
  return WASTE_WATER_SYSTEM_OPTIONS.find((o) => o.value === system)?.label ?? system;
}

export function normalizeWasteWaterSystem(raw?: string): WasteWaterSystemType | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === 'sewer') return 'sewer';
  if (v === 'septic') return 'septic';
  if (v === 'cesspool') return 'cesspool';
  if (v === 'other') return 'other';
  return undefined;
}

export function wasteWaterPhotoSlotsForDetails(details: WasteWaterDetails): {
  key: WasteWaterPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] {
  const slots: {
    key: WasteWaterPhotoSlotKey;
    label: string;
    hint: string;
    shortLabel: string;
  }[] = [WASTE_LINE_EXIT_SLOT];
  if (details.system === 'sewer') {
    slots.push(SEWER_BILL_SLOT);
  } else if (details.system === 'septic') {
    slots.push(TANK_LOCATION_SLOT, SEPTIC_FIELD_SLOT);
  } else if (details.system === 'cesspool') {
    slots.push(TANK_LOCATION_SLOT);
  }
  return slots;
}

export function wasteWaterHasInfo(details: WasteWaterDetails): boolean {
  return Boolean(details.system);
}
