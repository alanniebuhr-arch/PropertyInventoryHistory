import AsyncStorage from '@react-native-async-storage/async-storage';

const ROOM_SECTION_EXPAND_KEY = 'pih.roomSectionExpand';

export type RoomSectionExpandPrefs = {
  photos: boolean;
  reminders: boolean;
  assets: boolean;
};

const DEFAULT_ROOM_SECTION_EXPAND: RoomSectionExpandPrefs = {
  photos: true,
  reminders: true,
  assets: true,
};

let cachedExpand: RoomSectionExpandPrefs = { ...DEFAULT_ROOM_SECTION_EXPAND };
let loadedFromDisk = false;

function parseExpand(raw: string | null): RoomSectionExpandPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof RoomSectionExpandPrefs, unknown>>;
    if (!parsed || typeof parsed !== 'object') return null;
    const next: RoomSectionExpandPrefs = { ...DEFAULT_ROOM_SECTION_EXPAND };
    (Object.keys(DEFAULT_ROOM_SECTION_EXPAND) as (keyof RoomSectionExpandPrefs)[]).forEach(
      (key) => {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key];
      }
    );
    return next;
  } catch {
    return null;
  }
}

/** Sync read of room section expand prefs (memory, default expanded). Shared across rooms. */
export function getRoomSectionExpand(): RoomSectionExpandPrefs {
  return { ...cachedExpand };
}

export async function loadRoomSectionExpand(): Promise<RoomSectionExpandPrefs> {
  if (loadedFromDisk) return getRoomSectionExpand();
  try {
    const parsed = parseExpand(await AsyncStorage.getItem(ROOM_SECTION_EXPAND_KEY));
    if (parsed) cachedExpand = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return getRoomSectionExpand();
}

export async function setRoomSectionExpand(
  partial: Partial<RoomSectionExpandPrefs>
): Promise<void> {
  cachedExpand = { ...cachedExpand, ...partial };
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(ROOM_SECTION_EXPAND_KEY, JSON.stringify(cachedExpand));
  } catch {
    // Memory cache still updated for this session.
  }
}
