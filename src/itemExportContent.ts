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
import { formatCurrency, formatDate, nowISO } from './utils';
import { nextDueLabelForItem } from './itemMaintenance';

export type ItemExportRow = { label: string; value: string };
export type ItemExportSection = { title: string; rows: ItemExportRow[] };
export type ItemExportPhoto = { uri: string; label: string };
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
  return trimmed ? { label, value: trimmed } : null;
}

function section(title: string, rows: (ItemExportRow | null)[]): ItemExportSection | null {
  const filtered = rows.filter((r): r is ItemExportRow => r != null);
  return filtered.length > 0 ? { title, rows: filtered } : null;
}

function pushSection(sections: ItemExportSection[], next: ItemExportSection | null) {
  if (next) sections.push(next);
}

function collectSlotAndExtraPhotos(
  slots: { key: string; shortLabel: string }[],
  getSlotUri: (key: string) => string | undefined,
  extraPhotos: { localUri: string; caption?: string }[]
): ItemExportPhoto[] {
  const photos: ItemExportPhoto[] = [];
  for (const slot of slots) {
    const uri = getSlotUri(slot.key);
    if (uri) photos.push({ uri, label: slot.shortLabel });
  }
  for (const photo of extraPhotos) {
    photos.push({
      uri: photo.localUri,
      label: photo.caption?.trim() || 'Photo',
    });
  }
  return photos;
}

function collectPlainPhotos(state: AppState, itemId: string): ItemExportPhoto[] {
  return photosForItem(state, itemId).map((photo) => ({
    uri: photo.localUri,
    label: photo.caption?.trim() || 'Photo',
  }));
}

function collectItemPhotos(state: AppState, item: InventoryItem): ItemExportPhoto[] {
  const { itemTypeId, id: itemId, details } = item;

  if (itemTypeId === 'appliance' && details.kind === 'appliance') {
    return collectSlotAndExtraPhotos(
      APPLIANCE_PHOTO_SLOTS,
      (key) => applianceSlotPhotoUri(state, details, key as (typeof APPLIANCE_PHOTO_SLOTS)[number]['key']),
      applianceExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'electric_panel' && details.kind === 'electric_panel') {
    return collectSlotAndExtraPhotos(
      ELECTRIC_PANEL_PHOTO_SLOTS,
      (key) =>
        electricPanelSlotPhotoUri(state, details, key as (typeof ELECTRIC_PANEL_PHOTO_SLOTS)[number]['key']),
      electricPanelExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'furnace' && details.kind === 'furnace') {
    const slots = furnacePhotoSlotsForDetails(details);
    return collectSlotAndExtraPhotos(
      slots,
      (key) => furnaceSlotPhotoUri(state, details, key as (typeof slots)[number]['key']),
      furnaceExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'water_main' && details.kind === 'water_main') {
    const slots = waterMainPhotoSlotsForSource(details);
    return collectSlotAndExtraPhotos(
      slots,
      (key) => waterMainSlotPhotoUri(state, details, key as (typeof slots)[number]['key']),
      waterMainExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'waste_water' && details.kind === 'waste_water') {
    const slots = wasteWaterPhotoSlotsForDetails(details);
    return collectSlotAndExtraPhotos(
      slots,
      (key) => wasteWaterSlotPhotoUri(state, details, key as (typeof slots)[number]['key']),
      wasteWaterExtraPhotos(state, itemId, details)
    );
  }
  if (itemTypeId === 'water_treatment' && details.kind === 'water_treatment') {
    return collectSlotAndExtraPhotos(
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
      ]));
      break;
    }
    case 'water_heater': {
      if (details.kind !== 'water_heater') break;
      pushSection(sections, section('Water heater', [
        row('Make', details.make),
        row('Model', details.modelNumber),
        row('Serial number', details.serialNumber),
        row('Notes', details.notes),
      ]));
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
    case 'internet': {
      if (details.kind !== 'internet') break;
      pushSection(sections, section('Service', [
        row('ISP', details.isp),
        row('Router model', details.routerModel),
        row('Wi‑Fi SSID', details.wifiSsid),
      ]));
      pushSection(sections, section('Account', [row('Account notes', details.accountNotes)]));
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
      formatDate(event.occurredAtISO),
      event.cost != null ? formatCurrency(event.cost) : undefined,
      event.serviceCompany?.trim() || undefined,
      event.recurrence ? recurrenceLabel(event.recurrence) : undefined,
      event.notes?.trim() || undefined,
    ].filter((line): line is string => Boolean(line));

    const photos = photosForEvent(state, event.id).map((photo) => ({
      uri: photo.localUri,
      label:
        photo.caption === 'receipt' ? 'Receipt' : photo.caption?.trim() || 'Photo',
    }));

    return { title: event.title, lines, photos };
  });
}

export function buildItemExportSnapshot(state: AppState, itemId: string): ItemExportSnapshot | null {
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

  return {
    title: itemDisplayLabel({ ...item, details: item.details }),
    subtitle: 'Property Asset Manager',
    metaLines,
    sections: buildDetailSections(item),
    photos: collectItemPhotos(state, item),
    events: buildEventExports(state, itemId),
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
