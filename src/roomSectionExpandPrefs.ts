export type RoomSectionExpandPrefs = {
  photos: boolean;
  reminders: boolean;
  assets: boolean;
};

/** Session default: photos expanded; other sections collapsed until the user expands. */
const DEFAULT_ROOM_SECTION_EXPAND: RoomSectionExpandPrefs = {
  photos: true,
  reminders: false,
  assets: false,
};

let cachedExpand: RoomSectionExpandPrefs = { ...DEFAULT_ROOM_SECTION_EXPAND };

/** Sync read of room section expand prefs (session memory; photos default expanded). Shared across rooms. */
export function getRoomSectionExpand(): RoomSectionExpandPrefs {
  return { ...cachedExpand };
}

export async function loadRoomSectionExpand(): Promise<RoomSectionExpandPrefs> {
  return getRoomSectionExpand();
}

export async function setRoomSectionExpand(
  partial: Partial<RoomSectionExpandPrefs>
): Promise<void> {
  cachedExpand = { ...cachedExpand, ...partial };
}
