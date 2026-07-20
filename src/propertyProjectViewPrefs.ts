import AsyncStorage from '@react-native-async-storage/async-storage';

export type PropertyProjectViewMode = 'gallery' | 'list';

const PROPERTY_PROJECT_VIEW_KEY = 'pih.propertyProjectViewMode';
const DEFAULT_PROPERTY_PROJECT_VIEW: PropertyProjectViewMode = 'list';

let cachedPropertyProjectView: PropertyProjectViewMode = DEFAULT_PROPERTY_PROJECT_VIEW;
let loadedFromDisk = false;

function parseViewMode(raw: string | null): PropertyProjectViewMode | null {
  if (raw === 'gallery' || raw === 'list') return raw;
  return null;
}

export function getPropertyProjectViewMode(): PropertyProjectViewMode {
  return cachedPropertyProjectView;
}

export async function loadPropertyProjectViewMode(): Promise<PropertyProjectViewMode> {
  if (loadedFromDisk) return cachedPropertyProjectView;
  try {
    const parsed = parseViewMode(await AsyncStorage.getItem(PROPERTY_PROJECT_VIEW_KEY));
    if (parsed) cachedPropertyProjectView = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedPropertyProjectView;
}

export async function setPropertyProjectViewMode(mode: PropertyProjectViewMode): Promise<void> {
  cachedPropertyProjectView = mode;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(PROPERTY_PROJECT_VIEW_KEY, mode);
  } catch {
    // Memory cache still updated for this session.
  }
}
