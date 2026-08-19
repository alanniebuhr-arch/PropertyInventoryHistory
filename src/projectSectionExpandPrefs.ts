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
  boardAction: boolean;
  complainants: boolean;
};

/** Session default: photos expanded; other sections collapsed until the user expands. */
const DEFAULT_PROJECT_SECTION_EXPAND: ProjectSectionExpandPrefs = {
  photos: true,
  status: false,
  reminders: false,
  description: false,
  intro: false,
  questions: false,
  vendors: false,
  punchList: false,
  recentInteractions: false,
  boardAction: true,
  complainants: false,
};

let cachedExpand: ProjectSectionExpandPrefs = { ...DEFAULT_PROJECT_SECTION_EXPAND };

/** Sync read of project section expand prefs (session memory; photos default expanded). Shared across projects. */
export function getProjectSectionExpand(): ProjectSectionExpandPrefs {
  return { ...DEFAULT_PROJECT_SECTION_EXPAND, ...cachedExpand };
}

export async function loadProjectSectionExpand(): Promise<ProjectSectionExpandPrefs> {
  return getProjectSectionExpand();
}

export async function setProjectSectionExpand(
  partial: Partial<ProjectSectionExpandPrefs>
): Promise<void> {
  cachedExpand = { ...cachedExpand, ...partial };
}

/** What's happening bucket expand, keyed by project id. */
export type ProjectActivityBucketExpandPrefs = {
  activityFuture: boolean;
  activityToday: boolean;
  activityHistory: boolean;
};

const DEFAULT_PROJECT_ACTIVITY_BUCKET_EXPAND: ProjectActivityBucketExpandPrefs = {
  activityFuture: false,
  activityToday: true,
  activityHistory: true,
};

const activityBucketByProjectId = new Map<string, ProjectActivityBucketExpandPrefs>();

export function getProjectActivityBucketExpand(
  projectId: string
): ProjectActivityBucketExpandPrefs {
  const saved = activityBucketByProjectId.get(projectId);
  return saved
    ? { ...DEFAULT_PROJECT_ACTIVITY_BUCKET_EXPAND, ...saved }
    : { ...DEFAULT_PROJECT_ACTIVITY_BUCKET_EXPAND };
}

export function setProjectActivityBucketExpand(
  projectId: string,
  partial: Partial<ProjectActivityBucketExpandPrefs>
): void {
  const merged: ProjectActivityBucketExpandPrefs = {
    ...getProjectActivityBucketExpand(projectId),
    ...partial,
  };
  activityBucketByProjectId.set(projectId, merged);
}
