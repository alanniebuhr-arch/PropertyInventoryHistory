import type { AppState, InventoryItem, ItemDetails, ItemTypeId, Room } from './types';
import { defaultDetailsForType } from './itemCatalog';
import { uid, nowISO } from './utils';

export type DwellingType = 'house' | 'apartment';

export type PropertyTemplateItem = {
  itemTypeId: ItemTypeId;
  displayName?: string;
  applianceNickname?: string;
  panelName?: string;
};

export type PropertyTemplateRoom = {
  houseName: string;
  apartmentName?: string;
  sortOrder: number;
  items: PropertyTemplateItem[];
};

/**
 * Default room/item layout (from 24 Cedar Road).
 * Update via scripts/extract-template.mjs after exporting a backup without photos.
 */
export const DEFAULT_PROPERTY_TEMPLATE: PropertyTemplateRoom[] = [
  {
    houseName: 'Utilities',
    sortOrder: 0,
    items: [
      { itemTypeId: 'water_main' },
      { itemTypeId: 'water_heater' },
      { itemTypeId: 'water_treatment' },
      { itemTypeId: 'waste_water' },
      { itemTypeId: 'electric_panel' },
      { itemTypeId: 'furnace' },
      { itemTypeId: 'air_conditioner' },
      { itemTypeId: 'internet' },
    ],
  },
  {
    houseName: 'Kitchen',
    sortOrder: 1,
    items: [
      { itemTypeId: 'appliance', applianceNickname: 'Refrigerator' },
      { itemTypeId: 'appliance', applianceNickname: 'Stove' },
      { itemTypeId: 'appliance', applianceNickname: 'Dishwasher' },
      { itemTypeId: 'appliance', applianceNickname: 'Microwave' },
    ],
  },
  {
    houseName: 'Laundry',
    sortOrder: 2,
    items: [
      { itemTypeId: 'appliance', applianceNickname: 'Washer' },
      { itemTypeId: 'appliance', applianceNickname: 'Dryer' },
    ],
  },
  {
    houseName: 'Garage',
    sortOrder: 3,
    items: [{ itemTypeId: 'automobile' }],
  },
];

export function roomNameForDwelling(room: PropertyTemplateRoom, dwelling: DwellingType): string {
  return dwelling === 'apartment' && room.apartmentName ? room.apartmentName : room.houseName;
}

function detailsForTemplateItem(templateItem: PropertyTemplateItem): ItemDetails {
  const details = defaultDetailsForType(templateItem.itemTypeId);
  if (templateItem.itemTypeId === 'appliance' && details.kind === 'appliance') {
    return {
      ...details,
      nickname: templateItem.applianceNickname?.trim() || undefined,
    };
  }
  if (templateItem.itemTypeId === 'electric_panel' && details.kind === 'electric_panel') {
    return {
      ...details,
      name: templateItem.panelName?.trim() || undefined,
    };
  }
  return details;
}

export function applyPropertyTemplate(
  state: AppState,
  propertyId: string,
  dwellingType: DwellingType,
  template: PropertyTemplateRoom[] = DEFAULT_PROPERTY_TEMPLATE
): AppState {
  const createdAtISO = nowISO();
  const newRooms: Room[] = [];
  const newItems: InventoryItem[] = [];

  const sorted = [...template].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const templateRoom of sorted) {
    const roomId = uid('room');
    newRooms.push({
      id: roomId,
      propertyId,
      name: roomNameForDwelling(templateRoom, dwellingType),
      sortOrder: templateRoom.sortOrder,
      photoIds: [],
    });

    for (const templateItem of templateRoom.items) {
      newItems.push({
        id: uid('item'),
        roomId,
        itemTypeId: templateItem.itemTypeId,
        displayName:
          templateItem.itemTypeId === 'other'
            ? templateItem.displayName?.trim() || undefined
            : undefined,
        details: detailsForTemplateItem(templateItem),
        photoIds: [],
        createdAtISO,
      });
    }
  }

  return {
    ...state,
    rooms: [...state.rooms, ...newRooms],
    items: [...state.items, ...newItems],
  };
}
