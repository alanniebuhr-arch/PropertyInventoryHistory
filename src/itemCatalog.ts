import type { ItemDetails, ItemTypeId } from './types';



export type CatalogEntry = {

  id: ItemTypeId;

  label: string;

  defaultRecurrenceHint?: string;

};



/** Selectable item types when adding a new item. */

export const ITEM_CATALOG: CatalogEntry[] = [

  { id: 'water_main', label: 'Water main' },

  { id: 'water_heater', label: 'Water heater' },

  { id: 'water_treatment', label: 'Water treatment', defaultRecurrenceHint: 'Annual filter service' },

  { id: 'waste_water', label: 'Waste water', defaultRecurrenceHint: 'Annual service' },

  { id: 'electric_panel', label: 'Electric panel' },

  { id: 'internet', label: 'Internet' },

  { id: 'furnace', label: 'Heating', defaultRecurrenceHint: 'Annual maintenance' },

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

  if (item.itemTypeId === 'electric_panel' && item.details?.kind === 'electric_panel') {

    return item.details.name?.trim() || catalogLabel(item.itemTypeId);

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

  return undefined;

}

