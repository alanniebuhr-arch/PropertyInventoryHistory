import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECT_SECTION_EXPAND_KEY = 'pih.projectSectionExpand';

export type ProjectSectionExpandPrefs = {
  photos: boolean;
  status: boolean;
  reminders: boolean;
  description: boolean;
  intro: boolean;
  questions: boolean;
  vendors: boolean;
  punchList: boolean;
  recentInteractions: boolean;
};

const DEFAULT_PROJECT_SECTION_EXPAND: ProjectSectionExpandPrefs = {
  photos: true,
  status: true,
  reminders: true,
  description: true,
  intro: true,
  questions: true,
  vendors: true,
  punchList: true,
  recentInteractions: true,
};

let cachedExpand: ProjectSectionExpandPrefs = { ...DEFAULT_PROJECT_SECTION_EXPAND };
let loadedFromDisk = false;

function parseExpand(raw: string | null): ProjectSectionExpandPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof ProjectSectionExpandPrefs, unknown>>;
    if (!parsed || typeof parsed !== 'object') return null;
    const next: ProjectSectionExpandPrefs = { ...DEFAULT_PROJECT_SECTION_EXPAND };
    (Object.keys(DEFAULT_PROJECT_SECTION_EXPAND) as (keyof ProjectSectionExpandPrefs)[]).forEach(
      (key) => {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key];
      }
    );
    return next;
  } catch {
    return null;
  }
}

/** Sync read of project section expand prefs (memory, default expanded). Shared across projects. */
export function getProjectSectionExpand(): ProjectSectionExpandPrefs {
  return { ...cachedExpand };
}

export async function loadProjectSectionExpand(): Promise<ProjectSectionExpandPrefs> {
  if (loadedFromDisk) return getProjectSectionExpand();
  try {
    const parsed = parseExpand(await AsyncStorage.getItem(PROJECT_SECTION_EXPAND_KEY));
    if (parsed) cachedExpand = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return getProjectSectionExpand();
}

export async function setProjectSectionExpand(
  partial: Partial<ProjectSectionExpandPrefs>
): Promise<void> {
  cachedExpand = { ...cachedExpand, ...partial };
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(PROJECT_SECTION_EXPAND_KEY, JSON.stringify(cachedExpand));
  } catch {
    // Memory cache still updated for this session.
  }
}
