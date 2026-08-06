import type { ActivityTimeBucket } from './activityTimeBuckets';

/** Session expand flags for Future / Today / History / Undated list buckets. */
export type ActivityBucketExpandPrefs = {
  activityFuture: boolean;
  activityToday: boolean;
  activityHistory: boolean;
  activityUndated: boolean;
};

const DEFAULT_EXPAND: ActivityBucketExpandPrefs = {
  activityFuture: false,
  activityToday: true,
  activityHistory: true,
  activityUndated: true,
};

/** Session-only expand prefs keyed by screen + scope (e.g. `assets:property:xyz`). */
const expandByKey = new Map<string, ActivityBucketExpandPrefs>();

export function getActivityBucketExpand(key: string): ActivityBucketExpandPrefs {
  const saved = expandByKey.get(key);
  return saved
    ? { ...DEFAULT_EXPAND, ...saved }
    : { ...DEFAULT_EXPAND };
}

export function setActivityBucketExpand(
  key: string,
  next: Partial<ActivityBucketExpandPrefs>
): ActivityBucketExpandPrefs {
  const merged: ActivityBucketExpandPrefs = {
    ...getActivityBucketExpand(key),
    ...next,
  };
  expandByKey.set(key, merged);
  return { ...merged };
}

export function activityBucketExpandKey(
  screen: 'assets' | 'services' | 'interactions' | 'searchAll' | 'vendor',
  scopeKey: string
): string {
  return `${screen}:${scopeKey}`;
}

export function isActivityBucketExpanded(
  prefs: ActivityBucketExpandPrefs,
  bucket: ActivityTimeBucket
): boolean {
  if (bucket === 'future') return prefs.activityFuture;
  if (bucket === 'today') return prefs.activityToday;
  if (bucket === 'undated') return prefs.activityUndated;
  return prefs.activityHistory;
}
