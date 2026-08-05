import type { VendorContactMethod } from './types';

export type InteractionListFilterScopeKey =
  | 'all'
  | `property:${string}`
  | `project:${string}`;

export type InteractionListFilterPrefs = {
  selectedPropertyId: string | null;
  selectedProjectId: string | null;
  selectedVendorNameKey: string | null;
  selectedContactMethod: VendorContactMethod | null;
  selectedImportantOnly: boolean;
  searchQuery: string;
  forceShowSearch: boolean;
  activityFuture: boolean;
  activityToday: boolean;
  activityHistory: boolean;
  activityUndated: boolean;
};

const DEFAULT_FILTERS: InteractionListFilterPrefs = {
  selectedPropertyId: null,
  selectedProjectId: null,
  selectedVendorNameKey: null,
  selectedContactMethod: null,
  selectedImportantOnly: false,
  searchQuery: '',
  forceShowSearch: false,
  activityFuture: false,
  activityToday: true,
  activityHistory: true,
  activityUndated: true,
};

/** Session-only filters keyed by Interactions list scope. */
const filtersByScope = new Map<InteractionListFilterScopeKey, InteractionListFilterPrefs>();

export function interactionListFilterScopeKey(opts: {
  propertyId?: string;
  projectId?: string;
}): InteractionListFilterScopeKey {
  if (opts.projectId) return `project:${opts.projectId}`;
  if (opts.propertyId) return `property:${opts.propertyId}`;
  return 'all';
}

export function hasInteractionListFilters(
  scopeKey: InteractionListFilterScopeKey
): boolean {
  return filtersByScope.has(scopeKey);
}

export function getInteractionListFilters(
  scopeKey: InteractionListFilterScopeKey
): InteractionListFilterPrefs {
  const saved = filtersByScope.get(scopeKey);
  return saved ? { ...DEFAULT_FILTERS, ...saved } : { ...DEFAULT_FILTERS };
}

export function setInteractionListFilters(
  scopeKey: InteractionListFilterScopeKey,
  next: Partial<InteractionListFilterPrefs>
): InteractionListFilterPrefs {
  const merged: InteractionListFilterPrefs = {
    ...DEFAULT_FILTERS,
    ...getInteractionListFilters(scopeKey),
    ...next,
  };
  filtersByScope.set(scopeKey, merged);
  return { ...merged };
}
