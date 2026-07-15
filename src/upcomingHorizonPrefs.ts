import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPCOMING_HORIZON_OPTIONS, type UpcomingHorizon } from './eventRecurrence';

const PROPERTY_HORIZON_KEY = 'pih.propertyUpcomingHorizon';
const DEFAULT_PROPERTY_HORIZON: UpcomingHorizon = '1m';

let cachedPropertyHorizon: UpcomingHorizon = DEFAULT_PROPERTY_HORIZON;
let loadedFromDisk = false;

function parseHorizon(raw: string | null): UpcomingHorizon | null {
  if (!raw) return null;
  return UPCOMING_HORIZON_OPTIONS.some((opt) => opt.id === raw)
    ? (raw as UpcomingHorizon)
    : null;
}

/** Sync read of last Property Services upcoming horizon (memory, falls back to 1 month). */
export function getPropertyUpcomingHorizon(): UpcomingHorizon {
  return cachedPropertyHorizon;
}

export async function loadPropertyUpcomingHorizon(): Promise<UpcomingHorizon> {
  if (loadedFromDisk) return cachedPropertyHorizon;
  try {
    const parsed = parseHorizon(await AsyncStorage.getItem(PROPERTY_HORIZON_KEY));
    if (parsed) cachedPropertyHorizon = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedPropertyHorizon;
}

export async function setPropertyUpcomingHorizon(horizon: UpcomingHorizon): Promise<void> {
  cachedPropertyHorizon = horizon;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(PROPERTY_HORIZON_KEY, horizon);
  } catch {
    // Memory cache still updated for this session.
  }
}
