import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDE_REJECTED_VENDORS_KEY = 'pih.hideRejectedVendors';
const DEFAULT_HIDE_REJECTED = false;

let cachedHideRejected = DEFAULT_HIDE_REJECTED;
let loadedFromDisk = false;

/** Sync read of hide-rejected-vendors preference (memory, default show). Shared across projects. */
export function getHideRejectedVendors(): boolean {
  return cachedHideRejected;
}

export async function loadHideRejectedVendors(): Promise<boolean> {
  if (loadedFromDisk) return cachedHideRejected;
  try {
    const raw = await AsyncStorage.getItem(HIDE_REJECTED_VENDORS_KEY);
    if (raw === '1' || raw === '0') {
      cachedHideRejected = raw === '1';
    }
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedHideRejected;
}

export async function setHideRejectedVendors(hide: boolean): Promise<void> {
  cachedHideRejected = hide;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(HIDE_REJECTED_VENDORS_KEY, hide ? '1' : '0');
  } catch {
    // Memory cache still updated for this session.
  }
}
