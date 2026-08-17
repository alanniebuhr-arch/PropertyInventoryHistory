import type { InventoryItem } from './types';
import { itemCustomName } from './itemCatalog';
import { formatStoredDate } from './itemDetailDisplayHelpers';
import { formatCurrencyDisplay } from './utils';
import {
  fuelTankLocationLabel,
  fuelTankSizeLabel,
  fuelTypeLabel,
  heatDistributionLabel,
  heatSourceLabel,
} from './furnaceSlots';
import { acTypeLabel } from './airConditionerSlots';
import { automobileDescription } from './automobileSlots';
import { furnaceUsesFuelTank } from './furnaceSlots';
import { securitySystemTypeLabel } from './securitySystemSlots';
import { radonMitigationSystemTypeLabel } from './radonMitigationSlots';
import { valveTypeLabel, waterSourceLabel } from './waterMainSlots';
import { wasteWaterSystemLabel } from './wasteWaterSlots';
import { generatorFuelTypeLabel } from './generatorSlots';
import { sumpPumpRoleLabel } from './sumpPumpSlots';
import { roofMaterialLabel } from './roofSlots';
import { poolTypeLabel } from './poolSlots';
import { toiletFlushTypeLabel } from './toiletSlots';

export type ItemListSummaryField = { label: string; value: string };

function pushField(
  fields: ItemListSummaryField[],
  label: string,
  value?: string | null
) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  const formatted =
    /cost|price|paid/i.test(label)
      ? formatCurrencyDisplay(trimmed) || trimmed
      : trimmed;
  fields.push({ label, value: formatted });
}

export function itemListSummaryFields(item: InventoryItem): ItemListSummaryField[] {
  const { itemTypeId, details } = item;
  const fields: ItemListSummaryField[] = [];
  if (!details) return fields;

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
    case 'air_conditioner': {
      if (details.kind !== 'air_conditioner') break;
      pushField(fields, 'AC type', acTypeLabel(details.acType));
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Model', details.modelNumber);
      pushField(fields, 'Serial number', details.serialNumber);
      pushField(fields, 'Cooling capacity', details.tonnage);
      pushField(fields, 'Refrigerant', details.refrigerantType);
      pushField(fields, 'Filter size', details.filterSize);
      pushField(fields, 'Install date', formatStoredDate(details.installDateAtISO));
      pushField(fields, 'Service company', details.serviceCompany);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'automobile': {
      if (details.kind !== 'automobile') break;
      pushField(fields, 'Vehicle', automobileDescription(details));
      pushField(fields, 'Nickname', details.nickname);
      pushField(fields, 'VIN', details.vin);
      pushField(fields, 'License plate', details.licensePlate);
      pushField(fields, 'Purchase date', formatStoredDate(details.purchaseDateAtISO));
      pushField(fields, 'Mileage', details.currentMileage);
      pushField(fields, 'Service shop', details.serviceCompany);
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
      if (details.waterSource === 'well') {
        pushField(fields, 'Well head location', details.wellHeadLocation);
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
      if (details.system === 'septic') {
        pushField(fields, 'Gallons', details.gallons);
      }
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
      pushField(
        fields,
        'Fuel type',
        details.fuelType ? fuelTypeLabel(details.fuelType, details.fuelTypeOther) : undefined
      );
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Model', details.modelNumber);
      pushField(fields, 'Serial number', details.serialNumber);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'security_system': {
      if (details.kind !== 'security_system') break;
      pushField(
        fields,
        'System type',
        securitySystemTypeLabel(details.systemType, details.systemTypeOther)
      );
      pushField(fields, 'Monitoring', details.monitoringCompany);
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Panel location', details.panelLocation);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'radon_mitigation': {
      if (details.kind !== 'radon_mitigation') break;
      pushField(
        fields,
        'System type',
        radonMitigationSystemTypeLabel(details.systemType, details.systemTypeOther)
      );
      pushField(fields, 'Fan make', details.fanMake);
      pushField(fields, 'Fan location', details.fanLocation);
      pushField(fields, 'Last test', details.lastTestResult);
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
    case 'well_pump': {
      if (details.kind !== 'well_pump') break;
      pushField(fields, 'Pump make', details.pumpMake);
      pushField(fields, 'Pump model', details.pumpModel);
      pushField(fields, 'Well depth', details.wellDepth);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'generator': {
      if (details.kind !== 'generator') break;
      pushField(fields, 'Fuel type', generatorFuelTypeLabel(details.fuelType, details.fuelTypeOther));
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Wattage', details.wattage);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'sump_pump': {
      if (details.kind !== 'sump_pump') break;
      pushField(fields, 'Pump role', sumpPumpRoleLabel(details.pumpRole));
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Discharge location', details.dischargeLocation);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'garage_door': {
      if (details.kind !== 'garage_door') break;
      pushField(fields, 'Opener make', details.openerMake);
      pushField(fields, 'Opener model', details.openerModel);
      pushField(fields, 'Spring type', details.springType);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'roof': {
      if (details.kind !== 'roof') break;
      pushField(fields, 'Material', roofMaterialLabel(details.material, details.materialOther));
      pushField(fields, 'Color', details.color);
      pushField(fields, 'Install date', formatStoredDate(details.installDateAtISO));
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'pool': {
      if (details.kind !== 'pool') break;
      pushField(fields, 'Pool type', poolTypeLabel(details.poolType, details.poolTypeOther));
      pushField(fields, 'Volume (gallons)', details.volumeGallons);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'irrigation': {
      if (details.kind !== 'irrigation') break;
      pushField(fields, 'Controller make', details.controllerMake);
      pushField(fields, 'Zone count', details.zoneCount);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'ev_charger': {
      if (details.kind !== 'ev_charger') break;
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Amperage', details.amperage);
      pushField(fields, 'Connector type', details.connectorType);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'solar': {
      if (details.kind !== 'solar') break;
      pushField(fields, 'System size (kW)', details.systemSizeKw);
      pushField(fields, 'Panel make', details.panelMake);
      pushField(fields, 'Inverter make', details.inverterMake);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'hot_tub': {
      if (details.kind !== 'hot_tub') break;
      pushField(fields, 'Make', details.make);
      pushField(fields, 'Model', details.modelNumber);
      pushField(fields, 'Capacity (persons)', details.capacityPersons);
      pushField(fields, 'Notes', details.notes);
      break;
    }
    case 'toilet': {
      if (details.kind !== 'toilet') break;
      pushField(fields, 'Make', details.make);
      pushField(
        fields,
        'Flush type',
        toiletFlushTypeLabel(details.flushType, details.flushTypeOther)
      );
      pushField(fields, 'Flush valve kit', details.flushValveKit);
      pushField(fields, 'Fill valve kit', details.fillValveKit);
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

/** True when an asset has no custom name, summary fields, photos, or documents. */
export function isEmptyInventoryItem(item: InventoryItem): boolean {
  if (itemCustomName(item)) return false;
  if (itemListSummaryFields(item).length > 0) return false;
  if (item.photoIds.length > 0) return false;
  if (item.documentIds.length > 0) return false;
  return true;
}
