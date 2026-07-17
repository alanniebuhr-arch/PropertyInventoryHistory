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

/** Reserved photo slots that apply to rooms that typically hold insurance docs (e.g. Kitchen). */
export function roomPhotoSlotsForRoom(room: Pick<Room, 'name'>): RoomPhotoSlotDefinition[] {
  const name = room.name.trim().toLowerCase();
  if (name === 'utilities' || name === 'garage' || name === 'laundry') return [];
  return [HOUSE_INSURANCE_SLOT];
}
