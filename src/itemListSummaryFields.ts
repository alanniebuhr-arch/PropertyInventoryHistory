import type { InventoryItem } from './types';
import { formatStoredDate } from './itemDetailDisplayHelpers';
import {
  fuelTankLocationLabel,
  fuelTankSizeLabel,
  fuelTypeLabel,
  heatDistributionLabel,
  heatSourceLabel,
} from './furnaceSlots';
import { furnaceUsesFuelTank } from './furnaceSlots';
import { valveTypeLabel, waterSourceLabel } from './waterMainSlots';
import { wasteWaterSystemLabel } from './wasteWaterSlots';

export type ItemListSummaryField = { label: string; value: string };

function pushField(
  fields: ItemListSummaryField[],
  label: string,
  value?: string | null
) {
  const trimmed = value?.trim();
  if (trimmed) fields.push({ label, value: trimmed });
}

export function itemListSummaryFields(item: InventoryItem): ItemListSummaryField[] {
  const { itemTypeId, details } = item;
  const fields: ItemListSummaryField[] = [];

  switch (itemTypeId) {
    case 'appliance': {
      if (details.kind !== 'appliance') break;
      pushField(fields, 'Manufacturer', details.manufacturer);
      pushField(fields, 'Model #', details.modelNumber);
      pushField(fields, 'Serial #', details.serialNumber);
      pushField(fields, 'Where purchased', details.purchaseLocation);
      pushField(fields, 'Date purchased', formatStoredDate(details.purchaseDateAtISO));
      pushField(fields, 'Total paid', details.purchasePrice);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'furnace': {
      if (details.kind !== 'furnace') break;
      pushField(
        fields,
        'Heat source',
        details.systemType ? heatSourceLabel(details.systemType) : undefined
      );
      pushField(
        fields,
        'Heat distribution',
        details.heatDistribution
          ? heatDistributionLabel(details.heatDistribution, details.heatDistributionOther)
          : undefined
      );
      pushField(
        fields,
        'Fuel type',
        details.fuelType ? fuelTypeLabel(details.fuelType, details.fuelTypeOther) : undefined
      );
      if (furnaceUsesFuelTank(details.fuelType)) {
        pushField(fields, fuelTankLocationLabel(details.fuelType), details.fuelTankLocation);
        pushField(fields, fuelTankSizeLabel(details.fuelType), details.fuelTankSize);
      }
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Model', details.modelNumber);
      pushField(fields, 'Serial number', details.serialNumber);
      pushField(fields, 'Filter size', details.filterSize);
      pushField(fields, 'Install date', formatStoredDate(details.installDateAtISO));
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'water_main': {
      if (details.kind !== 'water_main') break;
      pushField(fields, 'Water source', waterSourceLabel(details.waterSource));
      pushField(fields, 'Shutoff location', details.shutoffLocation);
      pushField(fields, 'Valve type', valveTypeLabel(details.valveType));
      if (details.waterSource === 'municipal') {
        pushField(fields, 'Meter number', details.meterNumber);
      }
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'waste_water': {
      if (details.kind !== 'waste_water') break;
      pushField(
        fields,
        'System',
        wasteWaterSystemLabel(details.system, details.systemOther)
      );
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'electric_panel': {
      if (details.kind !== 'electric_panel') break;
      pushField(fields, 'Amperage', details.amperage);
      pushField(fields, 'Brand', details.brand);
      pushField(fields, 'Location notes', details.locationNotes);
      pushField(fields, 'Last inspected', formatStoredDate(details.lastInspectedAtISO));
      break;
    }
    case 'gas_main': {
      if (details.kind !== 'gas_main') break;
      pushField(fields, 'Shutoff location', details.shutoffLocation);
      pushField(fields, 'Provider', details.provider);
      pushField(fields, 'Meter number', details.meterNumber);
      break;
    }
    case 'water_heater': {
      if (details.kind !== 'water_heater') break;
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Model', details.modelNumber);
      pushField(fields, 'Serial number', details.serialNumber);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'water_treatment': {
      if (details.kind !== 'water_treatment') break;
      pushField(fields, 'System type', details.systemType);
      pushField(fields, 'Filter name', details.filterName);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'internet': {
      if (details.kind !== 'internet') break;
      pushField(fields, 'ISP', details.isp);
      pushField(fields, 'Router model', details.routerModel);
      pushField(fields, 'Wi‑Fi SSID', details.wifiSsid);
      pushField(fields, 'Account notes', details.accountNotes);
      break;
    }
    case 'other':
    default: {
      if (details.kind === 'other') {
        pushField(fields, 'Notes', details.notes);
      }
      break;
    }
  }

  return fields;
}
