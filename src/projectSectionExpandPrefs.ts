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

/** Session default: all collapsed until the user expands. */
const DEFAULT_PROJECT_SECTION_EXPAND: ProjectSectionExpandPrefs = {
  photos: false,
  status: false,
  reminders: false,
  description: false,
  intro: false,
  questions: false,
  vendors: false,
  punchList: false,
  recentInteractions: false,
};

let cachedExpand: ProjectSectionExpandPrefs = { ...DEFAULT_PROJECT_SECTION_EXPAND };

/** Sync read of project section expand prefs (session memory, default collapsed). Shared across projects. */
export function getProjectSectionExpand(): ProjectSectionExpandPrefs {
  return { ...cachedExpand };
}

export async function loadProjectSectionExpand(): Promise<ProjectSectionExpandPrefs> {
  return getProjectSectionExpand();
}

export async function setProjectSectionExpand(
  partial: Partial<ProjectSectionExpandPrefs>
): Promise<void> {
  cachedExpand = { ...cachedExpand, ...partial };
}
