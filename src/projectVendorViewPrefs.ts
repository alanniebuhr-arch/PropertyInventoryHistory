import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProjectVendorViewMode = 'gallery' | 'list';

const PROJECT_VENDOR_VIEW_KEY = 'pih.projectVendorViewMode';
const DEFAULT_PROJECT_VENDOR_VIEW: ProjectVendorViewMode = 'gallery';

let cachedProjectVendorView: ProjectVendorViewMode = DEFAULT_PROJECT_VENDOR_VIEW;
let loadedFromDisk = false;

function parseViewMode(raw: string | null): ProjectVendorViewMode | null {
  if (raw === 'gallery' || raw === 'list') return raw;
  return null;
}

export function getProjectVendorViewMode(): ProjectVendorViewMode {
  return cachedProjectVendorView;
}

export async function loadProjectVendorViewMode(): Promise<ProjectVendorViewMode> {
  if (loadedFromDisk) return cachedProjectVendorView;
  try {
    const parsed = parseViewMode(await AsyncStorage.getItem(PROJECT_VENDOR_VIEW_KEY));
    if (parsed) cachedProjectVendorView = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedProjectVendorView;
}

export async function setProjectVendorViewMode(mode: ProjectVendorViewMode): Promise<void> {
  cachedProjectVendorView = mode;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(PROJECT_VENDOR_VIEW_KEY, mode);
  } catch {
    // Memory cache still updated for this session.
  }
}
