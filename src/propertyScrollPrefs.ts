export type PropertyScrollPrefs = {
  scrollY: number;
};

const DEFAULT_PREFS: PropertyScrollPrefs = {
  scrollY: 0,
};

/** Session-only Property Detail scroll keyed by property id. */
const prefsByPropertyId = new Map<string, PropertyScrollPrefs>();

export function getPropertyScrollPrefs(propertyId: string): PropertyScrollPrefs {
  const saved = prefsByPropertyId.get(propertyId);
  return saved ? { ...saved } : { ...DEFAULT_PREFS };
}

export function setPropertyScrollPrefs(
  propertyId: string,
  next: Partial<PropertyScrollPrefs>
): PropertyScrollPrefs {
  const merged: PropertyScrollPrefs = {
    ...getPropertyScrollPrefs(propertyId),
    ...next,
  };
  prefsByPropertyId.set(propertyId, merged);
  return { ...merged };
}
