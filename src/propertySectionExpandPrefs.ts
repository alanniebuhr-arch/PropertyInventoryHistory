export type PropertySectionExpandPrefs = {
  photos: boolean;
  reminders: boolean;
  projects: boolean;
  rooms: boolean;
  todos: boolean;
  ideas: boolean;
  recentActivity: boolean;
};

/** Session default: all collapsed until the user expands. */
const DEFAULT_PROPERTY_SECTION_EXPAND: PropertySectionExpandPrefs = {
  photos: false,
  reminders: false,
  projects: false,
  rooms: false,
  todos: false,
  ideas: false,
  recentActivity: false,
};

/** Session-only Property Detail section expand keyed by property id. */
const expandByPropertyId = new Map<string, PropertySectionExpandPrefs>();

/** Sync read of property section expand prefs (session memory, default collapsed). */
export function getPropertySectionExpand(propertyId: string): PropertySectionExpandPrefs {
  const saved = expandByPropertyId.get(propertyId);
  return saved ? { ...saved } : { ...DEFAULT_PROPERTY_SECTION_EXPAND };
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
