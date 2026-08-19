import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDE_EMPTY_PROPERTY_SECTIONS_KEY = 'pih.hideEmptyPropertySections';
const DEFAULT_HIDE_EMPTY = false;

let cachedHideEmpty = DEFAULT_HIDE_EMPTY;
let loadedFromDisk = false;

/** Sync read of hide-empty-sections on Property Detail (memory, default show). */
export function getHideEmptyPropertySections(): boolean {
  return cachedHideEmpty;
}

export async function loadHideEmptyPropertySections(): Promise<boolean> {
  if (loadedFromDisk) return cachedHideEmpty;
  try {
    const raw = await AsyncStorage.getItem(HIDE_EMPTY_PROPERTY_SECTIONS_KEY);
    if (raw === '1' || raw === '0') {
      cachedHideEmpty = raw === '1';
    }
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedHideEmpty;
}

export async function setHideEmptyPropertySections(hide: boolean): Promise<void> {
  cachedHideEmpty = hide;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(HIDE_EMPTY_PROPERTY_SECTIONS_KEY, hide ? '1' : '0');
  } catch {
    // Memory cache still updated for this session.
  }
}
