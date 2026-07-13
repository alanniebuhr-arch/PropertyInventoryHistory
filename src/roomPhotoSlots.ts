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

/** Reserved photo slots that apply to all rooms except Utilities and Garage. */
export function roomPhotoSlotsForRoom(room: Pick<Room, 'name'>): RoomPhotoSlotDefinition[] {
  const name = room.name.trim().toLowerCase();
  if (name === 'utilities' || name === 'garage') return [];
  return [HOUSE_INSURANCE_SLOT];
}
