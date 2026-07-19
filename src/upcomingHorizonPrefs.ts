import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPCOMING_HORIZON_OPTIONS, type UpcomingHorizon } from './eventRecurrence';

/** Shared across Property / Room / Item "Service schedule" horizon pickers. */
const UPCOMING_HORIZON_KEY = 'pih.propertyUpcomingHorizon';
const DEFAULT_UPCOMING_HORIZON: UpcomingHorizon = '1m';

let cachedUpcomingHorizon: UpcomingHorizon = DEFAULT_UPCOMING_HORIZON;
let loadedFromDisk = false;

function parseHorizon(raw: string | null): UpcomingHorizon | null {
  if (!raw) return null;
  return UPCOMING_HORIZON_OPTIONS.some((opt) => opt.id === raw)
    ? (raw as UpcomingHorizon)
    : null;
}

/** Sync read of last Service schedule horizon (memory, falls back to 1 month). */
export function getPropertyUpcomingHorizon(): UpcomingHorizon {
  return cachedUpcomingHorizon;
}

export async function loadPropertyUpcomingHorizon(): Promise<UpcomingHorizon> {
  if (loadedFromDisk) return cachedUpcomingHorizon;
  try {
    const parsed = parseHorizon(await AsyncStorage.getItem(UPCOMING_HORIZON_KEY));
    if (parsed) cachedUpcomingHorizon = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedUpcomingHorizon;
}

export async function setPropertyUpcomingHorizon(horizon: UpcomingHorizon): Promise<void> {
  cachedUpcomingHorizon = horizon;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(UPCOMING_HORIZON_KEY, horizon);
  } catch {
    // Memory cache still updated for this session.
  }
}
