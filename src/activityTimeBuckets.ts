import { isAfterToday, isToday } from './eventRecurrence';

export type ActivityTimeBucket = 'future' | 'today' | 'history' | 'undated';

export type ActivityBucketGroup<T> = {
  bucket: ActivityTimeBucket;
  label: string;
  entries: T[];
};

export const ACTIVITY_BUCKET_LABEL: Record<ActivityTimeBucket, string> = {
  future: 'Future Activity',
  today: 'Today',
  history: 'History',
  undated: 'Undated',
};

/** Empty / invalid dates land in Undated (shown after History). */
export function activityBucketForAt(at: string): ActivityTimeBucket {
  if (!at.trim()) return 'undated';
  if (isAfterToday(at)) return 'future';
  if (isToday(at)) return 'today';
  return 'history';
}

/**
 * Sort by `at` descending (empty sorts last), then fold into contiguous
 * Future / Today / History / Undated groups.
 */
export function foldActivityBucketGroups<T>(
  items: T[],
  getAt: (item: T) => string
): ActivityBucketGroup<T>[] {
  const dated = items
    .map((entry) => ({ entry, at: getAt(entry) }))
    .sort((a, b) => b.at.localeCompare(a.at));

  const groups: ActivityBucketGroup<T>[] = [];
  for (const { entry, at } of dated) {
    const bucket = activityBucketForAt(at);
    const last = groups[groups.length - 1];
    if (!last || last.bucket !== bucket) {
      groups.push({
        bucket,
        label: ACTIVITY_BUCKET_LABEL[bucket],
        entries: [entry],
      });
    } else {
      last.entries.push(entry);
    }
  }
  return groups;
}

export function activityBucketCounts<T>(
  groups: ActivityBucketGroup<T>[]
): Record<ActivityTimeBucket, number> {
  const counts: Record<ActivityTimeBucket, number> = {
    future: 0,
    today: 0,
    history: 0,
    undated: 0,
  };
  for (const group of groups) {
    counts[group.bucket] = group.entries.length;
  }
  return counts;
}
