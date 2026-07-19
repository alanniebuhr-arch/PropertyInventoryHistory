import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoomItemViewMode = 'gallery' | 'list';

const ROOM_ITEM_VIEW_KEY = 'pih.roomItemViewMode';
const DEFAULT_ROOM_ITEM_VIEW: RoomItemViewMode = 'gallery';

let cachedRoomItemView: RoomItemViewMode = DEFAULT_ROOM_ITEM_VIEW;
let loadedFromDisk = false;

function parseViewMode(raw: string | null): RoomItemViewMode | null {
  if (raw === 'gallery' || raw === 'list') return raw;
  return null;
}

/** Sync read of last room Items view mode (memory, falls back to gallery). */
export function getRoomItemViewMode(): RoomItemViewMode {
  return cachedRoomItemView;
}

export async function loadRoomItemViewMode(): Promise<RoomItemViewMode> {
  if (loadedFromDisk) return cachedRoomItemView;
  try {
    const parsed = parseViewMode(await AsyncStorage.getItem(ROOM_ITEM_VIEW_KEY));
    if (parsed) cachedRoomItemView = parsed;
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedRoomItemView;
}

export async function setRoomItemViewMode(mode: RoomItemViewMode): Promise<void> {
  cachedRoomItemView = mode;
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(ROOM_ITEM_VIEW_KEY, mode);
  } catch {
    // Memory cache still updated for this session.
  }
}
