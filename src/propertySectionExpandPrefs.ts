export type PropertySectionExpandPrefs = {
  photos: boolean;
  reminders: boolean;
  projects: boolean;
  rooms: boolean;
  todos: boolean;
  ideas: boolean;
  recentActivity: boolean;
  /** What's happening bucket: Future Activity (default collapsed). */
  activityFuture: boolean;
  activityToday: boolean;
  activityHistory: boolean;
};

/** Session default: photos expanded; other sections collapsed until the user expands. */
const DEFAULT_PROPERTY_SECTION_EXPAND: PropertySectionExpandPrefs = {
  photos: true,
  reminders: false,
  projects: false,
  rooms: false,
  todos: false,
  ideas: false,
  recentActivity: false,
  activityFuture: false,
  activityToday: true,
  activityHistory: true,
};

/** Session-only Property Detail section expand keyed by property id. */
const expandByPropertyId = new Map<string, PropertySectionExpandPrefs>();

/** Sync read of property section expand prefs (session memory; photos default expanded). */
export function getPropertySectionExpand(propertyId: string): PropertySectionExpandPrefs {
  const saved = expandByPropertyId.get(propertyId);
  return saved
    ? { ...DEFAULT_PROPERTY_SECTION_EXPAND, ...saved }
    : { ...DEFAULT_PROPERTY_SECTION_EXPAND };
}

export async function loadPropertySectionExpand(
  propertyId: string
): Promise<PropertySectionExpandPrefs> {
  return getPropertySectionExpand(propertyId);
}

export async function setPropertySectionExpand(
  propertyId: string,
  partial: Partial<PropertySectionExpandPrefs>
): Promise<void> {
  const merged: PropertySectionExpandPrefs = {
    ...getPropertySectionExpand(propertyId),
    ...partial,
  };
  expandByPropertyId.set(propertyId, merged);
}
