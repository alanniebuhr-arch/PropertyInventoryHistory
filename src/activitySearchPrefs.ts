export type ActivitySearchScopeKey = 'all' | `property:${string}`;

export type ActivitySearchPrefs = {
  searchQuery: string;
  scrollY: number;
  /** Project filter within a property scope; always null for "all". */
  selectedProjectId: string | null;
  /** Future Activity bucket (default collapsed). */
  activityFuture: boolean;
  activityToday: boolean;
  activityHistory: boolean;
  activityUndated: boolean;
};

const DEFAULT_PREFS: ActivitySearchPrefs = {
  searchQuery: '',
  scrollY: 0,
  selectedProjectId: null,
  activityFuture: false,
  activityToday: true,
  activityHistory: true,
  activityUndated: true,
};

/** Session-only Search All query/scroll/project keyed by scope. */
const prefsByScope = new Map<ActivitySearchScopeKey, ActivitySearchPrefs>();

export function activitySearchScopeKey(propertyId?: string): ActivitySearchScopeKey {
  if (propertyId) return `property:${propertyId}`;
  return 'all';
}

export function getActivitySearchPrefs(
  scopeKey: ActivitySearchScopeKey
): ActivitySearchPrefs {
  const saved = prefsByScope.get(scopeKey);
  return saved ? { ...DEFAULT_PREFS, ...saved } : { ...DEFAULT_PREFS };
}

export function setActivitySearchPrefs(
  scopeKey: ActivitySearchScopeKey,
  next: Partial<ActivitySearchPrefs>
): ActivitySearchPrefs {
  const merged: ActivitySearchPrefs = {
    ...DEFAULT_PREFS,
    ...getActivitySearchPrefs(scopeKey),
    ...next,
  };
  prefsByScope.set(scopeKey, merged);
  return { ...merged };
}
