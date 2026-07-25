import AsyncStorage from '@react-native-async-storage/async-storage';

const SECTION_HELP_KEY = 'pih.sectionHelpVisible';
/** Legacy per-screen keys — migrated once into the shared preference. */
const LEGACY_PROPERTY_HELP_KEY = 'pih.propertyHelpVisible';
const LEGACY_PROJECT_HELP_KEY = 'pih.projectHelpVisible';
const DEFAULT_HELP_VISIBLE = false;

let cachedHelpVisible = DEFAULT_HELP_VISIBLE;
let loadedFromDisk = false;

/** Sync read of section-help visibility (memory, default off). Shared across screens. */
export function getSectionHelpVisible(): boolean {
  return cachedHelpVisible;
}

export async function loadSectionHelpVisible(): Promise<boolean> {
  if (loadedFromDisk) return cachedHelpVisible;
  try {
    const raw = await AsyncStorage.getItem(SECTION_HELP_KEY);
    if (raw === '1' || raw === '0') {
      cachedHelpVisible = raw === '1';
    } else {
      const legacyProperty = await AsyncStorage.getItem(LEGACY_PROPERTY_HELP_KEY);
      const legacyProject = await AsyncStorage.getItem(LEGACY_PROJECT_HELP_KEY);
      // Prefer an explicit "off" from either screen so turning help off sticks.
      if (legacyProperty === '0' || legacyProject === '0') cachedHelpVisible = false;
      else if (legacyProperty === '1' || legacyProject === '1') cachedHelpVisible = true;
      await AsyncStorage.setItem(SECTION_HELP_KEY, cachedHelpVisible ? '1' : '0');
    }
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedHelpVisible;
}

export async function setSectionHelpVisible(visible: boolean): Promise<void> {
  cachedHelpVisible = visible;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(SECTION_HELP_KEY, visible ? '1' : '0');
  } catch {
    // Memory cache still updated for this session.
  }
}
