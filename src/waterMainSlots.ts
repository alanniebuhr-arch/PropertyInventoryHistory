import type { WaterMainDetails, ValveType, WaterSource } from './types';

export type WaterMainPhotoSlotKey =
  | 'mainValvePhotoId'
  | 'waterBillPhotoId'
  | 'undergroundShutoffPhotoId'
  | 'wellHeadPhotoId';

const MAIN_VALVE_SLOT = {
  key: 'mainValvePhotoId' as const,
  label: 'Water main valve',
  hint: 'Photo of the main water shutoff valve',
  shortLabel: 'Water main valve',
};

const WATER_BILL_SLOT = {
  key: 'waterBillPhotoId' as const,
  label: 'Water bill',
  hint: 'Photo of a recent water bill',
  shortLabel: 'Water bill',
};

const UNDERGROUND_SHUTOFF_SLOT = {
  key: 'undergroundShutoffPhotoId' as const,
  label: 'Underground shutoff',
  hint: 'Photo of the underground shutoff',
  shortLabel: 'Underground shutoff',
};

const WELL_HEAD_SLOT = {
  key: 'wellHeadPhotoId' as const,
  label: 'Well head',
  hint: 'Photo of the well head',
  shortLabel: 'Well head',
};

export const WATER_SOURCE_OPTIONS: {
  value: WaterSource | undefined;
  label: string;
}[] = [
  { value: undefined, label: 'Not set' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'well', label: 'Well' },
];

export const VALVE_TYPE_OPTIONS: { value: ValveType; label: string }[] = [
  { value: 'ball_valve', label: 'Ball valve' },
  { value: 'gate', label: 'Gate' },
  { value: 'butterfly', label: 'Butterfly' },
  { value: 'underground_municipal', label: 'Underground municipal' },
];

export function waterSourceLabel(source?: WaterSource): string {
  return WATER_SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? 'Not set';
}

export function valveTypeLabel(valveType?: ValveType): string | undefined {
  if (!valveType) return undefined;
  return VALVE_TYPE_OPTIONS.find((o) => o.value === valveType)?.label ?? valveType;
}

export function waterMainPhotoSlotsForSource(details: WaterMainDetails): {
  key: WaterMainPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] {
  const slots: {
    key: WaterMainPhotoSlotKey;
    label: string;
    hint: string;
    shortLabel: string;
  }[] = [MAIN_VALVE_SLOT];
  if (details.waterSource === 'municipal') {
    slots.push(WATER_BILL_SLOT, UNDERGROUND_SHUTOFF_SLOT);
  } else if (details.waterSource === 'well') {
    slots.push(WELL_HEAD_SLOT);
  }
  return slots;
}

export function waterMainHasInfo(details: WaterMainDetails): boolean {
  return Boolean(
    details.waterSource ||
      details.shutoffLocation?.trim() ||
      details.valveType ||
      (details.waterSource === 'municipal' && details.meterNumber?.trim())
  );
}

export function normalizeWaterSource(raw?: string): WaterSource | undefined {
  if (raw === 'well') return 'well';
  if (raw === 'municipal' || raw === 'community') return 'municipal';
  return undefined;
}
