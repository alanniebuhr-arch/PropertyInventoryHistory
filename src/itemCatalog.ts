import type { ItemDetails, ItemTypeId } from './types';

export type CatalogEntry = {
  id: ItemTypeId;
  label: string;
  defaultRecurrenceHint?: string;
};

export const ITEM_CATALOG: CatalogEntry[] = [
  { id: 'gas_main', label: 'Gas main' },
  { id: 'water_main', label: 'Water main' },
  { id: 'electric_panel', label: 'Electric panel' },
  { id: 'internet', label: 'Internet' },
  { id: 'furnace', label: 'Furnace', defaultRecurrenceHint: 'Annual maintenance' },
  { id: 'appliance', label: 'Appliance' },
  { id: 'other', label: 'Other' },
];

export function catalogLabel(itemTypeId: ItemTypeId): string {
  return ITEM_CATALOG.find((e) => e.id === itemTypeId)?.label ?? itemTypeId;
}

export function defaultDetailsForType(itemTypeId: ItemTypeId): ItemDetails {
  switch (itemTypeId) {
    case 'gas_main':
      return { kind: 'gas_main' };
    case 'water_main':
      return { kind: 'water_main' };
    case 'electric_panel':
      return { kind: 'electric_panel' };
    case 'internet':
      return { kind: 'internet' };
    case 'furnace':
      return { kind: 'furnace' };
    case 'appliance':
      return { kind: 'appliance' };
    case 'other':
    default:
      return { kind: 'other' };
  }
}

export function itemDisplayLabel(item: {
  itemTypeId: ItemTypeId;
  displayName?: string;
  details?: ItemDetails;
}): string {
  if (item.itemTypeId === 'other') {
    return item.displayName?.trim() || 'Other item';
  }
  if (item.itemTypeId === 'appliance' && item.details?.kind === 'appliance') {
    return item.details.nickname?.trim() || catalogLabel(item.itemTypeId);
  }
  return catalogLabel(item.itemTypeId);
}
