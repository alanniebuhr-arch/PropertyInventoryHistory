import type { Room, RoomSlotKey } from './types';

export type RoomPhotoSlotDefinition = {
  key: RoomSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
};

const HOUSE_INSURANCE_SLOT: RoomPhotoSlotDefinition = {
  key: 'houseInsurance',
  label: 'House insurance',
  hint: 'Photo of the policy first page or the policy PDF',
  shortLabel: 'House insurance',
};

/** House insurance is reserved only for the Office room. */
export function roomPhotoSlotsForRoom(room: Pick<Room, 'name'>): RoomPhotoSlotDefinition[] {
  return room.name.trim().toLowerCase() === 'office' ? [HOUSE_INSURANCE_SLOT] : [];
}
