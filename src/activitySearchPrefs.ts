export type ActivitySearchScopeKey = 'all' | `property:${string}`;

export type ActivitySearchPrefs = {
  searchQuery: string;
  scrollY: number;
};

const DEFAULT_PREFS: ActivitySearchPrefs = {
  searchQuery: '',
  scrollY: 0,
};

/** Session-only Search All query/scroll keyed by scope. */
const prefsByScope = new Map<ActivitySearchScopeKey, ActivitySearchPrefs>();

export function activitySearchScopeKey(propertyId?: string): ActivitySearchScopeKey {
  if (propertyId) return `property:${propertyId}`;
  return 'all';
}

export function getActivitySearchPrefs(
  scopeKey: ActivitySearchScopeKey
): ActivitySearchPrefs {
  const saved = prefsByScope.get(scopeKey);
  return saved ? { ...saved } : { ...DEFAULT_PREFS };
}

export function setActivitySearchPrefs(
  scopeKey: ActivitySearchScopeKey,
  next: Partial<ActivitySearchPrefs>
): ActivitySearchPrefs {
  const merged: ActivitySearchPrefs = {
    ...getActivitySearchPrefs(scopeKey),
    ...next,
  };
  prefsByScope.set(scopeKey, merged);
  return { ...merged };
}
