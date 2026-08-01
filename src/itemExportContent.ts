import type { AppState, InventoryItem, ItemEvent } from './types';
import { APPLIANCE_PHOTO_SLOTS } from './applianceSlots';
import { applianceExtraPhotos, applianceSlotPhotoUri } from './appliancePhotos';
import { ELECTRIC_PANEL_PHOTO_SLOTS } from './electricPanelSlots';
import {
  electricPanelExtraPhotos,
  electricPanelSlotPhotoUri,
} from './electricPanelPhotos';
import {
  furnacePhotoSlotsForDetails,
  furnaceUsesFuelTank,
  fuelTankLocationLabel,
  fuelTankSizeLabel,
  fuelTypeLabel,
  heatDistributionLabel,
  heatSourceLabel,
} from './furnaceSlots';
import { furnaceExtraPhotos, furnaceSlotPhotoUri } from './furnacePhotos';
import {
  valveTypeLabel,
  waterMainPhotoSlotsForSource,
  waterSourceLabel,
} from './waterMainSlots';
import { waterMainExtraPhotos, waterMainSlotPhotoUri } from './waterMainPhotos';
import {
  wasteWaterPhotoSlotsForDetails,
  wasteWaterSystemLabel,
} from './wasteWaterSlots';
import { wasteWaterExtraPhotos, wasteWaterSlotPhotoUri } from './wasteWaterPhotos';
import {
  WATER_HEATER_PHOTO_SLOTS,
} from './waterHeaterSlots';
import {
  waterHeaterExtraPhotos,
  waterHeaterSlotPhotoUri,
} from './waterHeaterPhotos';
import {
  SECURITY_SYSTEM_PHOTO_SLOTS,
  securitySystemTypeLabel,
} from './securitySystemSlots';
import {
  securitySystemExtraPhotos,
  securitySystemSlotPhotoUri,
} from './securitySystemPhotos';
import {
  RADON_MITIGATION_PHOTO_SLOTS,
  radonMitigationSystemTypeLabel,
} from './radonMitigationSlots';
import {
  radonMitigationExtraPhotos,
  radonMitigationSlotPhotoUri,
} from './radonMitigationPhotos';
import { WELL_PUMP_PHOTO_SLOTS } from './wellPumpSlots';
import { wellPumpExtraPhotos, wellPumpSlotPhotoUri } from './wellPumpPhotos';
import { GENERATOR_PHOTO_SLOTS, generatorFuelTypeLabel } from './generatorSlots';
import { generatorExtraPhotos, generatorSlotPhotoUri } from './generatorPhotos';
import { SUMP_PUMP_PHOTO_SLOTS, sumpPumpRoleLabel } from './sumpPumpSlots';
import { sumpPumpExtraPhotos, sumpPumpSlotPhotoUri } from './sumpPumpPhotos';
import { GARAGE_DOOR_PHOTO_SLOTS } from './garageDoorSlots';
import { garageDoorExtraPhotos, garageDoorSlotPhotoUri } from './garageDoorPhotos';
import { ROOF_PHOTO_SLOTS, roofMaterialLabel } from './roofSlots';
import { roofExtraPhotos, roofSlotPhotoUri } from './roofPhotos';
import { POOL_PHOTO_SLOTS, poolTypeLabel } from './poolSlots';
import { poolExtraPhotos, poolSlotPhotoUri } from './poolPhotos';
import { IRRIGATION_PHOTO_SLOTS } from './irrigationSlots';
import { irrigationExtraPhotos, irrigationSlotPhotoUri } from './irrigationPhotos';
import { EV_CHARGER_PHOTO_SLOTS } from './evChargerSlots';
import { evChargerExtraPhotos, evChargerSlotPhotoUri } from './evChargerPhotos';
import { SOLAR_PHOTO_SLOTS } from './solarSlots';
import { solarExtraPhotos, solarSlotPhotoUri } from './solarPhotos';
import { HOT_TUB_PHOTO_SLOTS } from './hotTubSlots';
import { hotTubExtraPhotos, hotTubSlotPhotoUri } from './hotTubPhotos';
import {
  WATER_TREATMENT_PHOTO_SLOTS,
} from './waterTreatmentSlots';
import {
  waterTreatmentExtraPhotos,
  waterTreatmentSlotPhotoUri,
} from './waterTreatmentPhotos';
import {
  AIR_CONDITIONER_PHOTO_SLOTS,
  acTypeLabel,
} from './airConditionerSlots';
import {
  airConditionerExtraPhotos,
  airConditionerSlotPhotoUri,
} from './airConditionerPhotos';
import {
  AUTOMOBILE_PHOTO_SLOTS,
} from './automobileSlots';
import {
  automobileExtraPhotos,
  automobileSlotPhotoUri,
} from './automobilePhotos';
import { automobileDescription } from './automobileSlots';
import { catalogLabel, itemDisplayLabel } from './itemCatalog';
import { formatStoredDate } from './itemDetailDisplayHelpers';
import { EVENT_TYPE_LABELS, recurrenceLabel } from './eventRecurrence';
import { itemById, photosForEvent, photosForItem, propertyById, roomById, serviceHistoryEventsForItem } from './storage';
import { formatCurrency, formatCurrencyDisplay, formatDate, formatDisplayDate, formatPhoneNumber, nowISO } from './utils';
import type { SharePhotoMode } from './sharePhotoMode';
import { nextDueLabelForItem } from './itemMaintenance';

export type ItemExportRow = { label: string; value: string };
export type ItemExportSection = { title: string; rows: ItemExportRow[] };
export type ItemExportPhoto = { uri: string; label: string; notes?: string };
export type ItemExportEvent = {
  title: string;
  lines: string[];
  photos: ItemExportPhoto[];
};

export type ItemExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  sections: ItemExportSection[];
  photos: ItemExportPhoto[];
  events: ItemExportEvent[];
  exportedAtLabel: string;
};

function row(label: string, value?: string | null): ItemExportRow | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let formatted = trimmed;
  if (/phone/i.test(label)) {
    formatted = formatPhoneNumber(trimmed) || trimmed;
  } else if (/cost|price|paid/i.test(label)) {
    formatted = formatCurrencyDisplay(trimmed) || trimmed;
  }
  return { label, value: formatted };
}

function section(title: string, rows: (ItemExportRow | null)[]): ItemExportSection | null {
  const filtered = rows.filter((r): r is ItemExportRow => r != null);
  return filtered.length > 0 ? { title, rows: filtered } : null;
}

function pushSection(sections: ItemExportSection[], next: ItemExportSection | null) {
  if (next) sections.push(next);
}

function notesForPhotoUri(state: AppState, uri: string): string | undefined {
  return state.photos.find((p) => p.localUri === uri)?.notes?.trim() || undefined;
}

function collectSlotAndExtraPhotos(
  state: AppState,
  slots: { key: string; shortLabel: string }[],
  getSlotUri: (key: string) => string | undefined,
  extraPhotos: { localUri: string; caption?: string; notes?: string }[]
): ItemExportPhoto[] {
  const photos: ItemExportPhoto[] = [];
  for (const slot of slots) {
    const uri = getSlotUri(slot.key);
    if (uri) {
      photos.push({
        uri,
        label: slot.shortLabel,
        notes: notesForPhotoUri(state, uri),
      });
    }
  }
  for (const photo of extraPhotos) {
    photos.push({
      uri: photo.localUri,
      label: photo.caption?.trim() || 'Photo',
      notes: photo.notes?.trim() || undefined,
    });
  }
  return photos;
}

function collectPlainPhotos(state: AppState, itemId: string): ItemExportPhoto[] {
  return photosForItem(state, itemId).map((photo) => ({
    uri: photo.localUri,
    label: photo.caption?.trim() || 'Photo',
    notes: photo.notes?.trim() || undefined,
  }));
}

function collectItemPhotos(state: AppState, item: InventoryItem): ItemExportPhoto[] {
  const { itemTypeId, id: itemId, details } = item;

  if (itemTypeId === 'appliance' && details.kind === 'appliance') {
    return collectSlotAndExtraPhotos(
      state,
      APPLIANCE_PHOTO_SLOTS,
      (key) => applianceSlotPhotoUri(state, details, key as (typeof APPLIANCE_PHOTO_SLOTS)[number]['key']),
      applianceExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'electric_panel' && details.kind === 'electric_panel') {
    return collectSlotAndExtraPhotos(
      state,
      ELECTRIC_PANEL_PHOTO_SLOTS,
      (key) =>
        electricPanelSlotPhotoUri(state, details, key as (typeof ELECTRIC_PANEL_PHOTO_SLOTS)[number]['key']),
      electricPanelExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'furnace' && details.kind === 'furnace') {
    const slots = furnacePhotoSlotsForDetails(details);
    return collectSlotAndExtraPhotos(
      state,
      slots,
      (key) => furnaceSlotPhotoUri(state, details, key as (typeof slots)[number]['key']),
      furnaceExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'water_main' && details.kind === 'water_main') {
    const slots = waterMainPhotoSlotsForSource(details);
    return collectSlotAndExtraPhotos(
      state,
      slots,
      (key) => waterMainSlotPhotoUri(state, details, key as (typeof slots)[number]['key']),
      waterMainExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'waste_water' && details.kind === 'waste_water') {
    const slots = wasteWaterPhotoSlotsForDetails(details);
    return collectSlotAndExtraPhotos(
      state,
      slots,
      (key) => wasteWaterSlotPhotoUri(state, details, key as (typeof slots)[number]['key']),
      wasteWaterExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'water_heater' && details.kind === 'water_heater') {
    return collectSlotAndExtraPhotos(
      state,
      WATER_HEATER_PHOTO_SLOTS,
      (key) =>
        waterHeaterSlotPhotoUri(
          state,
          details,
          key as (typeof WATER_HEATER_PHOTO_SLOTS)[number]['key']
        ),
      waterHeaterExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'security_system' && details.kind === 'security_system') {
    return collectSlotAndExtraPhotos(
      state,
      SECURITY_SYSTEM_PHOTO_SLOTS,
      (key) =>
        securitySystemSlotPhotoUri(
          state,
          details,
          key as (typeof SECURITY_SYSTEM_PHOTO_SLOTS)[number]['key']
        ),
      securitySystemExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'radon_mitigation' && details.kind === 'radon_mitigation') {
    return collectSlotAndExtraPhotos(
      state,
      RADON_MITIGATION_PHOTO_SLOTS,
      (key) =>
        radonMitigationSlotPhotoUri(
          state,
          details,
          key as (typeof RADON_MITIGATION_PHOTO_SLOTS)[number]['key']
        ),
      radonMitigationExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'well_pump' && details.kind === 'well_pump') {
    return collectSlotAndExtraPhotos(
      state,
      WELL_PUMP_PHOTO_SLOTS,
      (key) => wellPumpSlotPhotoUri(state, details, key as (typeof WELL_PUMP_PHOTO_SLOTS)[number]['key']),
      wellPumpExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'generator' && details.kind === 'generator') {
    return collectSlotAndExtraPhotos(
      state,
      GENERATOR_PHOTO_SLOTS,
      (key) => generatorSlotPhotoUri(state, details, key as (typeof GENERATOR_PHOTO_SLOTS)[number]['key']),
      generatorExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'sump_pump' && details.kind === 'sump_pump') {
    return collectSlotAndExtraPhotos(
      state,
      SUMP_PUMP_PHOTO_SLOTS,
      (key) => sumpPumpSlotPhotoUri(state, details, key as (typeof SUMP_PUMP_PHOTO_SLOTS)[number]['key']),
      sumpPumpExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'garage_door' && details.kind === 'garage_door') {
    return collectSlotAndExtraPhotos(
      state,
      GARAGE_DOOR_PHOTO_SLOTS,
      (key) => garageDoorSlotPhotoUri(state, details, key as (typeof GARAGE_DOOR_PHOTO_SLOTS)[number]['key']),
      garageDoorExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'roof' && details.kind === 'roof') {
    return collectSlotAndExtraPhotos(
      state,
      ROOF_PHOTO_SLOTS,
      (key) => roofSlotPhotoUri(state, details, key as (typeof ROOF_PHOTO_SLOTS)[number]['key']),
      roofExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'pool' && details.kind === 'pool') {
    return collectSlotAndExtraPhotos(
      state,
      POOL_PHOTO_SLOTS,
      (key) => poolSlotPhotoUri(state, details, key as (typeof POOL_PHOTO_SLOTS)[number]['key']),
      poolExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'irrigation' && details.kind === 'irrigation') {
    return collectSlotAndExtraPhotos(
      state,
      IRRIGATION_PHOTO_SLOTS,
      (key) => irrigationSlotPhotoUri(state, details, key as (typeof IRRIGATION_PHOTO_SLOTS)[number]['key']),
      irrigationExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'ev_charger' && details.kind === 'ev_charger') {
    return collectSlotAndExtraPhotos(
      state,
      EV_CHARGER_PHOTO_SLOTS,
      (key) => evChargerSlotPhotoUri(state, details, key as (typeof EV_CHARGER_PHOTO_SLOTS)[number]['key']),
      evChargerExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'solar' && details.kind === 'solar') {
    return collectSlotAndExtraPhotos(
      state,
      SOLAR_PHOTO_SLOTS,
      (key) => solarSlotPhotoUri(state, details, key as (typeof SOLAR_PHOTO_SLOTS)[number]['key']),
      solarExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'hot_tub' && details.kind === 'hot_tub') {
    return collectSlotAndExtraPhotos(
      state,
      HOT_TUB_PHOTO_SLOTS,
      (key) => hotTubSlotPhotoUri(state, details, key as (typeof HOT_TUB_PHOTO_SLOTS)[number]['key']),
      hotTubExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'water_treatment' && details.kind === 'water_treatment') {
    return collectSlotAndExtraPhotos(
      state,
      WATER_TREATMENT_PHOTO_SLOTS,
      (key) =>
        waterTreatmentSlotPhotoUri(
          state,
          details,
          key as (typeof WATER_TREATMENT_PHOTO_SLOTS)[number]['key']
        ),
      waterTreatmentExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'air_conditioner' && details.kind === 'air_conditioner') {
    return collectSlotAndExtraPhotos(
      state,
      AIR_CONDITIONER_PHOTO_SLOTS,
      (key) =>
        airConditionerSlotPhotoUri(
          state,
          details,
          key as (typeof AIR_CONDITIONER_PHOTO_SLOTS)[number]['key']
        ),
      airConditionerExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'automobile' && details.kind === 'automobile') {
    return collectSlotAndExtraPhotos(
      state,
      AUTOMOBILE_PHOTO_SLOTS,
      (key) =>
        automobileSlotPhotoUri(
          state,
          details,
          key as (typeof AUTOMOBILE_PHOTO_SLOTS)[number]['key']
        ),
      automobileExtraPhotos(state, itemId, details)
    );
  }

  return collectPlainPhotos(state, itemId);
}

function buildDetailSections(item: InventoryItem): ItemExportSection[] {
  const sections: ItemExportSection[] = [];
  const { itemTypeId, displayName, details } = item;

  switch (itemTypeId) {
    case 'appliance': {
      if (details.kind !== 'appliance') break;
      pushSection(sections, section('Appliance', [
        row('Name', details.nickname),
        row('Manufacturer', details.manufacturer),
        row('Model #', details.modelNumber),
        row('Serial #', details.serialNumber),
        row('Notes', details.notes),
      ]));
      pushSection(sections, section('Purchase', [
        row('Where purchased', details.purchaseLocation),
        row('Date purchased', formatStoredDate(details.purchaseDateAtISO)),
        row('Total paid', details.purchasePrice),
        row('Purchase notes', details.purchaseNotes),
      ]));
      pushSection(sections, section('Repair contact', [
        row('Company', details.repairCompany),
        row('Phone', details.repairPhone),
        row('Website', details.repairWebsite),
      ]));
      break;
    }
    case 'furnace': {
      if (details.kind !== 'furnace') break;
      pushSection(sections, section('Equipment', [
        row('Heat source', details.systemType ? heatSourceLabel(details.systemType) : undefined),
        row(
          'Heat distribution',
          details.heatDistribution
            ? heatDistributionLabel(details.heatDistribution, details.heatDistributionOther)
            : undefined
        ),
        row('Fuel type', details.fuelType ? fuelTypeLabel(details.fuelType, details.fuelTypeOther) : undefined),
        ...(furnaceUsesFuelTank(details.fuelType)
          ? [
              row(fuelTankLocationLabel(details.fuelType), details.fuelTankLocation),
              row(fuelTankSizeLabel(details.fuelType), details.fuelTankSize),
            ]
          : []),
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Filter size', details.filterSize),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Install cost', details.installCost),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'air_conditioner': {
      if (details.kind !== 'air_conditioner') break;
      pushSection(sections, section('Equipment', [
        row('AC type', acTypeLabel(details.acType)),
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Cooling capacity (tons)', details.tonnage),
        row('Refrigerant type', details.refrigerantType),
        row('Filter size', details.filterSize),
        row('Location notes', details.locationNotes),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Install cost', details.installCost),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'automobile': {
      if (details.kind !== 'automobile') break;
      pushSection(sections, section('Vehicle', [
        row('Nickname', details.nickname),
        row('Description', automobileDescription(details)),
        row('Year', details.year),
        row('Make', details.make),
        row('Model', details.model),
        row('Trim', details.trim),
        row('VIN', details.vin),
        row('License plate', details.licensePlate),
        row('Color', details.color),
      ]));
      pushSection(sections, section('Purchase', [
        row('Purchase date', formatStoredDate(details.purchaseDateAtISO)),
        row('Purchase price', details.purchasePrice),
        row('Where purchased', details.purchaseLocation),
        row('Mileage at purchase', details.purchaseMileage),
      ]));
      pushSection(sections, section('Maintenance', [
        row('Current mileage', details.currentMileage),
        row('Oil type', details.oilType),
        row('Oil filter', details.oilFilter),
        row('Tire size', details.tireSize),
      ]));
      pushSection(sections, section('Service & insurance', [
        row('Service shop', details.serviceCompany),
        row('Service phone', details.servicePhone),
        row('Insurance company', details.insuranceCompany),
        row('Insurance phone', details.insurancePhone),
        row('Policy number', details.insurancePolicyNumber),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'water_main': {
      if (details.kind !== 'water_main') break;
      pushSection(sections, section('Water main', [
        row('Water source', waterSourceLabel(details.waterSource)),
        row('Shutoff location', details.shutoffLocation),
        row('Valve type', valveTypeLabel(details.valveType)),
        row('Meter number', details.waterSource === 'municipal' ? details.meterNumber : undefined),
        row(
          'Well head location',
          details.waterSource === 'well' ? details.wellHeadLocation : undefined
        ),
        row('Notes', details.notes),
      ]));
      break;
    }
    case 'waste_water': {
      if (details.kind !== 'waste_water') break;
      pushSection(sections, section('Waste water', [
        row('System', wasteWaterSystemLabel(details.system, details.systemOther)),
        ...(details.system === 'septic'
          ? [row('Number of gallons', details.gallons)]
          : []),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'electric_panel': {
      if (details.kind !== 'electric_panel') break;
      pushSection(sections, section('Panel', [
        row('Name', details.name),
        row('Amperage', details.amperage),
        row('Brand', details.brand),
        row('Location notes', details.locationNotes),
        row('Notes', details.notes),
        row('Last inspected', formatStoredDate(details.lastInspectedAtISO)),
      ]));
      break;
    }
    case 'gas_main': {
      if (details.kind !== 'gas_main') break;
      pushSection(sections, section('Gas main', [
        row('Shutoff location', details.shutoffLocation),
        row('Provider', details.provider),
        row('Meter number', details.meterNumber),
        row('Notes', details.notes),
      ]));
      break;
    }
    case 'water_heater': {
      if (details.kind !== 'water_heater') break;
      pushSection(sections, section('Water heater', [
        row('Fuel type', details.fuelType ? fuelTypeLabel(details.fuelType, details.fuelTypeOther) : undefined),
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Notes', details.notes),
      ]));
      break;
    }
    case 'security_system': {
      if (details.kind !== 'security_system') break;
      pushSection(sections, section('System', [
        row('System type', securitySystemTypeLabel(details.systemType, details.systemTypeOther)),
        row('Control panel location', details.panelLocation),
        row('Keypad location', details.keypadLocation),
        row('Access notes', details.accessNotes),
      ]));
      pushSection(sections, section('Monitoring', [
        row('Monitoring company', details.monitoringCompany),
        row('Account number', details.accountNumber),
        row('Monitoring phone', details.monitoringPhone),
      ]));
      pushSection(sections, section('Equipment', [
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'radon_mitigation': {
      if (details.kind !== 'radon_mitigation') break;
      pushSection(sections, section('System', [
        row(
          'System type',
          radonMitigationSystemTypeLabel(details.systemType, details.systemTypeOther)
        ),
        row('Fan location', details.fanLocation),
        row('Suction point location', details.suctionPointLocation),
        row('Discharge location', details.dischargeLocation),
        row('Manometer reading', details.manometerReading),
      ]));
      pushSection(sections, section('Equipment', [
        row('Fan make', details.fanMake),
        row('Fan model', details.fanModel),
        row('Fan serial number', details.fanSerialNumber),
      ]));
      pushSection(sections, section('Radon test', [
        row('Last test date', formatStoredDate(details.lastTestDateAtISO)),
        row('Last test result', details.lastTestResult),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'water_treatment': {
      if (details.kind !== 'water_treatment') break;
      pushSection(sections, section('Water treatment', [
        row('System type', details.systemType),
        row('Filter name', details.filterName),
        row('Notes', details.notes),
      ]));
      break;
    }
    case 'well_pump': {
      if (details.kind !== 'well_pump') break;
      pushSection(sections, section('Equipment', [
        row('Pump make', details.pumpMake),
        row('Pump model', details.pumpModel),
        row('Pump serial number', details.pumpSerialNumber),
        row('Pressure tank size', details.pressureTankSize),
      ]));
      pushSection(sections, section('Well', [
        row('Well depth', details.wellDepth),
        row('Yield (GPM)', details.yieldGpm),
        row('Location notes', details.locationNotes),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'generator': {
      if (details.kind !== 'generator') break;
      pushSection(sections, section('Equipment', [
        row('Fuel type', generatorFuelTypeLabel(details.fuelType, details.fuelTypeOther)),
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Wattage', details.wattage),
        row('Transfer switch location', details.transferSwitchLocation),
      ]));
      pushSection(sections, section('Exercise', [
        row('Runtime hours', details.runtimeHours),
        row('Last exercise date', formatStoredDate(details.lastExerciseAtISO)),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'sump_pump': {
      if (details.kind !== 'sump_pump') break;
      pushSection(sections, section('System', [
        row('Pump role', sumpPumpRoleLabel(details.pumpRole)),
        row('Discharge location', details.dischargeLocation),
        row('Location notes', details.locationNotes),
        row('Battery backup notes', details.batteryBackupNotes),
      ]));
      pushSection(sections, section('Equipment', [
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'garage_door': {
      if (details.kind !== 'garage_door') break;
      pushSection(sections, section('Equipment', [
        row('Opener make', details.openerMake),
        row('Opener model', details.openerModel),
        row('Opener serial number', details.openerSerialNumber),
        row('Spring type', details.springType),
        row('Programming notes', details.programmingNotes),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'roof': {
      if (details.kind !== 'roof') break;
      pushSection(sections, section('Roof', [
        row('Material', roofMaterialLabel(details.material, details.materialOther)),
        row('Color', details.color),
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Warranty expires', formatStoredDate(details.warrantyExpiresAtISO)),
        row('Last inspected', formatStoredDate(details.lastInspectedAtISO)),
      ]));
      pushSection(sections, section('Contractor', [
        row('Contractor name', details.contractorName),
        row('Contractor phone', details.contractorPhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'pool': {
      if (details.kind !== 'pool') break;
      pushSection(sections, section('Pool', [
        row('Pool type', poolTypeLabel(details.poolType, details.poolTypeOther)),
        row('Volume (gallons)', details.volumeGallons),
        row('Heater type', details.heaterType),
        row('Chemical notes', details.chemicalNotes),
      ]));
      pushSection(sections, section('Equipment', [
        row('Filter make', details.filterMake),
        row('Filter model', details.filterModel),
        row('Pump make', details.pumpMake),
        row('Pump model', details.pumpModel),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'irrigation': {
      if (details.kind !== 'irrigation') break;
      pushSection(sections, section('System', [
        row('Controller make', details.controllerMake),
        row('Controller model', details.controllerModel),
        row('Zone count', details.zoneCount),
        row('Backflow location', details.backflowLocation),
        row('Winterize notes', details.winterizeNotes),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'ev_charger': {
      if (details.kind !== 'ev_charger') break;
      pushSection(sections, section('Equipment', [
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Amperage', details.amperage),
        row('Connector type', details.connectorType),
        row('Circuit breaker', details.circuitBreaker),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'solar': {
      if (details.kind !== 'solar') break;
      pushSection(sections, section('System', [
        row('System size (kW)', details.systemSizeKw),
        row('Panel make', details.panelMake),
        row('Panel model', details.panelModel),
        row('Panel count', details.panelCount),
      ]));
      pushSection(sections, section('Inverter', [
        row('Inverter make', details.inverterMake),
        row('Inverter model', details.inverterModel),
        row('Inverter serial number', details.inverterSerialNumber),
      ]));
      pushSection(sections, section('Production / account', [
        row('Notes', details.productionAccountNotes),
        row('Warranty notes', details.warrantyNotes),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
        row('Installer name', details.installerName),
        row('Installer phone', details.installerPhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'hot_tub': {
      if (details.kind !== 'hot_tub') break;
      pushSection(sections, section('Hot tub', [
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Capacity (persons)', details.capacityPersons),
        row('Filter model', details.filterModel),
        row('Heater type', details.heaterType),
      ]));
      pushSection(sections, section('Maintenance', [
        row('Chemical notes', details.chemicalNotes),
      ]));
      pushSection(sections, section('Install', [
        row('Install date', formatStoredDate(details.installDateAtISO)),
      ]));
      pushSection(sections, section('Service contact', [
        row('Service company', details.serviceCompany),
        row('Service phone', details.servicePhone),
      ]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'internet': {
      if (details.kind !== 'internet') break;
      pushSection(sections, section('Service', [
        row('ISP', details.isp),
        row('Router model', details.routerModel),
        row('Wi‑Fi SSID', details.wifiSsid),
      ]));
      pushSection(sections, section('Account', [row('Account notes', details.accountNotes)]));
      pushSection(sections, section('Notes', [row('Notes', details.notes)]));
      break;
    }
    case 'other':
    default: {
      const other = details.kind === 'other' ? details : { kind: 'other' as const };
      pushSection(sections, section('Asset', [
        row('Name', displayName),
        row('Notes', other.notes),
      ]));
      break;
    }
  }

  return sections;
}

function buildEventExports(state: AppState, itemId: string): ItemExportEvent[] {
  return serviceHistoryEventsForItem(state, itemId).map((event: ItemEvent) => {
    const lines = [
      EVENT_TYPE_LABELS[event.eventType],
      formatDisplayDate(event.occurredAtISO),
      event.cost != null ? formatCurrency(event.cost) : undefined,
      event.serviceCompany?.trim() || undefined,
      event.recurrence ? recurrenceLabel(event.recurrence) : undefined,
      event.notes?.trim() || undefined,
    ].filter((line): line is string => Boolean(line));

    const photos = photosForEvent(state, event.id).map((photo) => ({
      uri: photo.localUri,
      label:
        photo.caption === 'receipt' ? 'Receipt' : photo.caption?.trim() || 'Photo',
      notes: photo.notes?.trim() || undefined,
    }));

    return { title: event.title, lines, photos };
  });
}

export function buildItemExportSnapshot(
  state: AppState,
  itemId: string,
  options?: { photoMode?: SharePhotoMode }
): ItemExportSnapshot | null {
  const item = itemById(state, itemId);
  if (!item) return null;

  const room = roomById(state, item.roomId);
  const property = room ? propertyById(state, room.propertyId) : undefined;
  const nextDue = nextDueLabelForItem(state, itemId);

  const metaLines = [
    property?.name,
    room?.name,
    catalogLabel(item.itemTypeId),
    property?.address,
    nextDue ? `Next service due: ${nextDue}` : undefined,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());

  const photoMode = options?.photoMode ?? 'all';
  let photos = collectItemPhotos(state, item);
  if (photoMode === 'favorites') {
    const favoriteUris = new Set(
      photosForItem(state, itemId)
        .filter((photo) => photo.favorite === true)
        .map((photo) => photo.localUri)
    );
    photos = photos.filter((photo) => favoriteUris.has(photo.uri));
  }

  return {
    title: itemDisplayLabel({ ...item, details: item.details }),
    subtitle: 'Property Asset Manager',
    metaLines,
    sections: buildDetailSections(item),
    photos,
    events: buildEventExports(state, itemId),
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
