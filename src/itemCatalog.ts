import type { InventoryItem, ItemDetails, ItemTypeId } from './types';
import { automobileDescription } from './automobileSlots';
import { nowISO, uid } from './utils';



export type CatalogEntry = {

  id: ItemTypeId;

  label: string;

  defaultRecurrenceHint?: string;

};



/** Selectable asset types when adding a new asset. */

export const ITEM_CATALOG: CatalogEntry[] = [

  { id: 'water_main', label: 'Water main' },

  { id: 'water_heater', label: 'Water heater' },

  { id: 'water_treatment', label: 'Water treatment', defaultRecurrenceHint: 'Annual filter service' },

  { id: 'waste_water', label: 'Waste water', defaultRecurrenceHint: 'Annual service' },

  { id: 'electric_panel', label: 'Electrical panel' },

  { id: 'internet', label: 'Internet' },

  { id: 'furnace', label: 'Heating', defaultRecurrenceHint: 'Annual maintenance' },

  { id: 'air_conditioner', label: 'Air conditioner', defaultRecurrenceHint: 'Annual maintenance' },

  { id: 'automobile', label: 'Automobile', defaultRecurrenceHint: 'Oil change & inspection' },

  { id: 'appliance', label: 'Appliance' },

  { id: 'other', label: 'Other' },

];



const LEGACY_ITEM_LABELS: Partial<Record<ItemTypeId, string>> = {

  gas_main: 'Gas main',

};



export function catalogLabel(itemTypeId: ItemTypeId): string {

  return (

    ITEM_CATALOG.find((e) => e.id === itemTypeId)?.label ??

    LEGACY_ITEM_LABELS[itemTypeId] ??

    itemTypeId

  );

}



export function namePlaceholderForItemType(itemTypeId: ItemTypeId): string {
  switch (itemTypeId) {
    case 'other':
      return 'Describe this asset';
    case 'appliance':
      return 'e.g. Refrigerator';
    case 'electric_panel':
      return 'e.g. Main panel';
    case 'automobile':
      return 'e.g. Family SUV';
    default:
      return 'Optional name';
  }
}

export function createInventoryItem(
  roomId: string,
  itemTypeId: ItemTypeId,
  name: string
): InventoryItem {
  const trimmed = name.trim();
  let details = defaultDetailsForType(itemTypeId);
  let displayName: string | undefined;

  if (itemTypeId === 'other') {
    displayName = trimmed;
  } else if (trimmed) {
    if (itemTypeId === 'appliance' && details.kind === 'appliance') {
      details = { ...details, nickname: trimmed };
    } else if (itemTypeId === 'electric_panel' && details.kind === 'electric_panel') {
      details = { ...details, name: trimmed };
    } else if (itemTypeId === 'automobile' && details.kind === 'automobile') {
      details = { ...details, nickname: trimmed };
    } else {
      displayName = trimmed;
    }
  }

  return {
    id: uid('item'),
    roomId,
    itemTypeId,
    displayName,
    details,
    photoIds: [],
    documentIds: [],
    createdAtISO: nowISO(),
  };
}

export function defaultDetailsForType(itemTypeId: ItemTypeId): ItemDetails {

  switch (itemTypeId) {

    case 'gas_main':

      return { kind: 'gas_main' };

    case 'water_main':

      return { kind: 'water_main' };

    case 'water_heater':

      return { kind: 'water_heater' };

    case 'water_treatment':

      return { kind: 'water_treatment' };

    case 'waste_water':

      return { kind: 'waste_water' };

    case 'electric_panel':

      return { kind: 'electric_panel' };

    case 'internet':

      return { kind: 'internet' };

    case 'furnace':

      return { kind: 'furnace' };

    case 'air_conditioner':

      return { kind: 'air_conditioner' };

    case 'automobile':

      return { kind: 'automobile' };

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

    return item.displayName?.trim() || 'Other asset';

  }

  if (item.itemTypeId === 'appliance' && item.details?.kind === 'appliance') {

    return item.details.nickname?.trim() || catalogLabel(item.itemTypeId);

  }

  if (item.itemTypeId === 'electric_panel' && item.details?.kind === 'electric_panel') {

    return item.details.name?.trim() || catalogLabel(item.itemTypeId);

  }

  if (item.itemTypeId === 'automobile' && item.details?.kind === 'automobile') {

    return item.details.nickname?.trim() || automobileDescription(item.details) || catalogLabel(item.itemTypeId);

  }

  return catalogLabel(item.itemTypeId);

}



export function itemCustomName(item: {

  itemTypeId: ItemTypeId;

  displayName?: string;

  details?: ItemDetails;

}): string | undefined {

  if (item.itemTypeId === 'other') {

    return item.displayName?.trim() || undefined;

  }

  if (item.itemTypeId === 'appliance' && item.details?.kind === 'appliance') {

    return item.details.nickname?.trim() || undefined;

  }

  if (item.itemTypeId === 'electric_panel' && item.details?.kind === 'electric_panel') {

    return item.details.name?.trim() || undefined;

  }

  if (item.itemTypeId === 'automobile' && item.details?.kind === 'automobile') {

    const nickname = item.details.nickname?.trim();
    const description = automobileDescription(item.details);
    if (nickname && description) return description;
    return undefined;

  }

  return undefined;

}

export function itemListRowLabels(item: {
  itemTypeId: ItemTypeId;
  displayName?: string;
  details?: ItemDetails;
}): { label: string; nameLabel?: string } {
  if (item.itemTypeId === 'other') {
    const customName = item.displayName?.trim();
    if (customName) {
      return { label: customName, nameLabel: catalogLabel('other') };
    }
    return { label: catalogLabel('other') };
  }
  if (item.itemTypeId === 'automobile' && item.details?.kind === 'automobile') {
    const nickname = item.details.nickname?.trim();
    const description = automobileDescription(item.details);
    const primary = nickname || description;
    if (primary) {
      return { label: primary, nameLabel: catalogLabel('automobile') };
    }
    return { label: catalogLabel('automobile') };
  }
  return {
    label: catalogLabel(item.itemTypeId),
    nameLabel: itemCustomName(item),
  };
}

