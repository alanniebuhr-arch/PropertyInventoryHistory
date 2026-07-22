import type { AppState } from './types';

/** Normalize optional hidden named-slot keys from persisted state. */
export function normalizeHiddenPhotoSlotKeys(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const keys = raw.filter((key): key is string => typeof key === 'string' && key.length > 0);
  const unique = [...new Set(keys)];
  return unique.length > 0 ? unique : undefined;
}

export function withHiddenPhotoSlotKey(
  existing: string[] | undefined,
  key: string
): string[] {
  const next = new Set(existing ?? []);
  next.add(key);
  return [...next];
}

export function hidePropertyPhotoSlotKey(
  state: AppState,
  propertyId: string,
  key: string
): AppState {
  return {
    ...state,
    properties: state.properties.map((property) =>
      property.id === propertyId
        ? {
            ...property,
            hiddenPhotoSlotKeys: withHiddenPhotoSlotKey(property.hiddenPhotoSlotKeys, key),
          }
        : property
    ),
  };
}

export function restorePropertyHiddenPhotoSlots(
  state: AppState,
  propertyId: string
): AppState {
  return {
    ...state,
    properties: state.properties.map((property) =>
      property.id === propertyId
        ? { ...property, hiddenPhotoSlotKeys: undefined }
        : property
    ),
  };
}

export function hideRoomPhotoSlotKey(
  state: AppState,
  roomId: string,
  key: string
): AppState {
  return {
    ...state,
    rooms: state.rooms.map((room) =>
      room.id === roomId
        ? {
            ...room,
            hiddenPhotoSlotKeys: withHiddenPhotoSlotKey(room.hiddenPhotoSlotKeys, key),
          }
        : room
    ),
  };
}

export function restoreRoomHiddenPhotoSlots(state: AppState, roomId: string): AppState {
  return {
    ...state,
    rooms: state.rooms.map((room) =>
      room.id === roomId ? { ...room, hiddenPhotoSlotKeys: undefined } : room
    ),
  };
}

export function hideItemPhotoSlotKey(
  state: AppState,
  itemId: string,
  key: string
): AppState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            hiddenPhotoSlotKeys: withHiddenPhotoSlotKey(item.hiddenPhotoSlotKeys, key),
          }
        : item
    ),
  };
}

export function restoreItemHiddenPhotoSlots(state: AppState, itemId: string): AppState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === itemId ? { ...item, hiddenPhotoSlotKeys: undefined } : item
    ),
  };
}
