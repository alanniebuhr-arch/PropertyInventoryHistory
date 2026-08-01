export type ProjectScrollPrefs = {
  scrollY: number;
};

const DEFAULT_PREFS: ProjectScrollPrefs = {
  scrollY: 0,
};

/** Session-only Project Detail scroll keyed by project id. */
const prefsByProjectId = new Map<string, ProjectScrollPrefs>();

export function getProjectScrollPrefs(projectId: string): ProjectScrollPrefs {
  const saved = prefsByProjectId.get(projectId);
  return saved ? { ...saved } : { ...DEFAULT_PREFS };
}

export function setProjectScrollPrefs(
  projectId: string,
  next: Partial<ProjectScrollPrefs>
): ProjectScrollPrefs {
  const merged: ProjectScrollPrefs = {
    ...getProjectScrollPrefs(projectId),
    ...next,
  };
  prefsByProjectId.set(projectId, merged);
  return { ...merged };
}
