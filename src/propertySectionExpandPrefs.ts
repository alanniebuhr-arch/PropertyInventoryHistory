import AsyncStorage from '@react-native-async-storage/async-storage';

const PROPERTY_SECTION_EXPAND_KEY = 'pih.propertySectionExpand';

export type PropertySectionExpandPrefs = {
  photos: boolean;
  reminders: boolean;
  projects: boolean;
  rooms: boolean;
  todos: boolean;
  ideas: boolean;
  recentActivity: boolean;
};

const DEFAULT_PROPERTY_SECTION_EXPAND: PropertySectionExpandPrefs = {
  photos: true,
  reminders: true,
  projects: true,
  rooms: true,
  todos: true,
  ideas: true,
  recentActivity: true,
};

let cachedExpand: PropertySectionExpandPrefs = { ...DEFAULT_PROPERTY_SECTION_EXPAND };
let loadedFromDisk = false;

function parseExpand(raw: string | null): PropertySectionExpandPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof PropertySectionExpandPrefs, unknown>>;
    if (!parsed || typeof parsed !== 'object') return null;
    const next: PropertySectionExpandPrefs = { ...DEFAULT_PROPERTY_SECTION_EXPAND };
    (Object.keys(DEFAULT_PROPERTY_SECTION_EXPAND) as (keyof PropertySectionExpandPrefs)[]).forEach(
      (key) => {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key];
      }
    );
    return next;
  } catch {
    return null;
  }
}

/** Sync read of property section expand prefs (memory, default expanded). Shared across properties. */
export function getPropertySectionExpand(): PropertySectionExpandPrefs {
  return { ...cachedExpand };
}

export async function loadPropertySectionExpand(): Promise<PropertySectionExpandPrefs> {
  if (loadedFromDisk) return getPropertySectionExpand();
  try {
    const parsed = parseExpand(await AsyncStorage.getItem(PROPERTY_SECTION_EXPAND_KEY));
    if (parsed) cachedExpand = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return getPropertySectionExpand();
}

export async function setPropertySectionExpand(
  partial: Partial<PropertySectionExpandPrefs>
): Promise<void> {
  cachedExpand = { ...cachedExpand, ...partial };
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(PROPERTY_SECTION_EXPAND_KEY, JSON.stringify(cachedExpand));
  } catch {
    // Memory cache still updated for this session.
  }
}
