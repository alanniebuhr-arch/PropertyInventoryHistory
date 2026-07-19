import AsyncStorage from '@react-native-async-storage/async-storage';

export type PropertyRoomViewMode = 'gallery' | 'list';

const PROPERTY_ROOM_VIEW_KEY = 'pih.propertyRoomViewMode';
/** Default to list — the pre-existing Property Rooms layout. */
const DEFAULT_PROPERTY_ROOM_VIEW: PropertyRoomViewMode = 'list';

let cachedPropertyRoomView: PropertyRoomViewMode = DEFAULT_PROPERTY_ROOM_VIEW;
let loadedFromDisk = false;

function parseViewMode(raw: string | null): PropertyRoomViewMode | null {
  if (raw === 'gallery' || raw === 'list') return raw;
  return null;
}

/** Sync read of last Property Rooms view mode (memory, falls back to list). */
export function getPropertyRoomViewMode(): PropertyRoomViewMode {
  return cachedPropertyRoomView;
}

export async function loadPropertyRoomViewMode(): Promise<PropertyRoomViewMode> {
  if (loadedFromDisk) return cachedPropertyRoomView;
  try {
    const parsed = parseViewMode(await AsyncStorage.getItem(PROPERTY_ROOM_VIEW_KEY));
    if (parsed) cachedPropertyRoomView = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedPropertyRoomView;
}

export async function setPropertyRoomViewMode(mode: PropertyRoomViewMode): Promise<void> {
  cachedPropertyRoomView = mode;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(PROPERTY_ROOM_VIEW_KEY, mode);
  } catch {
    // Memory cache still updated for this session.
  }
}
