import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppState,
  ElectricPanelDetails,
  FurnaceDetails,
  InventoryItem,
  ItemDetails,
  ItemEvent,
  ItemPhoto,
  ItemTypeId,
  Property,
  PropertyPhoto,
  PropertyTodo,
  PropertyTodoKind,
  Project,
  ProjectPhoto,
  ProjectPunchItem,
  ProjectVendor,
  Room,
  VendorInteraction,
  VendorPhoto,
  WaterMainDetails,
  WaterTreatmentDetails,
} from './types';
import { EMPTY_APP_STATE } from './types';
import { defaultDetailsForType, catalogLabel, itemCustomName } from './itemCatalog';
import { normalizeWaterSource } from './waterMainSlots';
import { normalizeWasteWaterSystem } from './wasteWaterSlots';
import { furnaceUsesFuelShutoff, furnaceUsesFuelTank, normalizeFuelType, normalizeHeatDistribution } from './furnaceSlots';
import { APPLIANCE_PHOTO_SLOTS } from './applianceSlots';
import { ELECTRIC_PANEL_PHOTO_SLOTS } from './electricPanelSlots';
import { WATER_HEATER_PHOTO_SLOTS } from './waterHeaterSlots';
import { SECURITY_SYSTEM_PHOTO_SLOTS, normalizeSecuritySystemType } from './securitySystemSlots';
import {
  RADON_MITIGATION_PHOTO_SLOTS,
  normalizeRadonMitigationSystemType,
} from './radonMitigationSlots';
import { WELL_PUMP_PHOTO_SLOTS } from './wellPumpSlots';
import { GENERATOR_PHOTO_SLOTS, normalizeGeneratorFuelType } from './generatorSlots';
import { SUMP_PUMP_PHOTO_SLOTS, normalizeSumpPumpRole } from './sumpPumpSlots';
import { GARAGE_DOOR_PHOTO_SLOTS } from './garageDoorSlots';
import { ROOF_PHOTO_SLOTS, normalizeRoofMaterial } from './roofSlots';
import { POOL_PHOTO_SLOTS, normalizePoolType } from './poolSlots';
import { IRRIGATION_PHOTO_SLOTS } from './irrigationSlots';
import { EV_CHARGER_PHOTO_SLOTS } from './evChargerSlots';
import { SOLAR_PHOTO_SLOTS } from './solarSlots';
import { HOT_TUB_PHOTO_SLOTS } from './hotTubSlots';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';
import { isAfterToday, serviceListDateISO } from './eventRecurrence';
import { normalizeHiddenPhotoSlotKeys } from './hiddenPhotoSlots';
import { recordInferredDeletions } from './syncMeta';
import { ensureUpdatedAt, stampChangedRecords } from './syncStamp';
import { nowISO } from './utils';
import { resolveAppFileUri, toStoredAppFileUri } from './appFileUri';

const STORAGE_KEY = 'property_inventory_state_v1';

function enforceExclusivePhotoDocument<T extends Record<string, string | undefined>>(
  entity: T,
  photoSlotKey: string
): T {
  const docKey = documentIdKeyForPhotoSlot(photoSlotKey);
  if (entity[photoSlotKey] && entity[docKey]) {
    return { ...entity, [docKey]: undefined };
  }
  return entity;
}

function enforceExclusiveSlots<T extends Record<string, string | undefined>>(
  entity: T,
  photoSlotKeys: string[]
): T {
  let next = entity;
  for (const key of photoSlotKeys) {
    next = enforceExclusivePhotoDocument(next, key);
  }
  return next;
}

function normalizeFurnaceDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'furnace') return defaultDetailsForType('furnace');
  const legacy = details as FurnaceDetails & { modelSerial?: string; installYear?: string };
  const fuelType = normalizeFuelType(
    typeof details.fuelType === 'string' ? details.fuelType : undefined
  );
  const heatDistribution = normalizeHeatDistribution(
    typeof details.heatDistribution === 'string' ? details.heatDistribution : undefined
  );
  return {
    kind: 'furnace',
    systemType: details.systemType,
    heatDistribution,
    heatDistributionOther:
      heatDistribution === 'other'
        ? typeof details.heatDistributionOther === 'string'
          ? details.heatDistributionOther.trim() || undefined
          : undefined
        : undefined,
    make: details.make,
    fuelType,
    fuelTypeOther:
      fuelType === 'other'
        ? typeof details.fuelTypeOther === 'string'
          ? details.fuelTypeOther.trim() || undefined
          : undefined
        : undefined,
    modelNumber: details.modelNumber ?? legacy.modelSerial,
    serialNumber: details.serialNumber,
    filterSize: details.filterSize,
    systemFrontPhotoId: details.systemFrontPhotoId,
    systemSidePhotoId: details.systemSidePhotoId,
    systemTagPhotoId: details.systemType ? details.systemTagPhotoId : undefined,
    fuelShutoffPhotoId: furnaceUsesFuelShutoff(fuelType) ? details.fuelShutoffPhotoId : undefined,
    fuelTankPhotoId: furnaceUsesFuelTank(fuelType) ? details.fuelTankPhotoId : undefined,
    fuelTankLocation: furnaceUsesFuelTank(fuelType)
      ? typeof details.fuelTankLocation === 'string'
        ? details.fuelTankLocation.trim() || undefined
        : undefined
      : undefined,
    fuelTankSize: furnaceUsesFuelTank(fuelType)
      ? typeof details.fuelTankSize === 'string'
        ? details.fuelTankSize.trim() || undefined
        : undefined
      : undefined,
    receiptPhotoId: details.receiptPhotoId,
    systemFrontDocumentId: details.systemFrontDocumentId,
    systemSideDocumentId: details.systemSideDocumentId,
    systemTagDocumentId: details.systemTagDocumentId,
    fuelShutoffDocumentId: details.fuelShutoffDocumentId,
    fuelTankDocumentId: details.fuelTankDocumentId,
    receiptDocumentId: details.receiptDocumentId,
    installDateAtISO: details.installDateAtISO ?? legacy.installYear,
    installCost: details.installCost,
    installerName: details.installerName,
    installerPhone: details.installerPhone,
    notes: details.notes,
  };
}

function normalizeWaterMainDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'water_main') return defaultDetailsForType('water_main');
  const legacy = details as WaterMainDetails & { waterSource?: string };
  return {
    kind: 'water_main',
    waterSource: normalizeWaterSource(legacy.waterSource),
    shutoffLocation: details.shutoffLocation,
    valveType: details.valveType,
    meterNumber: details.meterNumber,
    wellHeadLocation: details.wellHeadLocation,
    mainValvePhotoId: details.mainValvePhotoId,
    waterBillPhotoId: details.waterBillPhotoId,
    undergroundShutoffPhotoId: details.undergroundShutoffPhotoId,
    wellHeadPhotoId: details.wellHeadPhotoId,
    mainValveDocumentId: details.mainValveDocumentId,
    waterBillDocumentId: details.waterBillDocumentId,
    undergroundShutoffDocumentId: details.undergroundShutoffDocumentId,
    wellHeadDocumentId: details.wellHeadDocumentId,
    notes: details.notes,
  };
}

function normalizeWasteWaterDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'waste_water') return defaultDetailsForType('waste_water');
  const system = normalizeWasteWaterSystem(
    typeof details.system === 'string' ? details.system : undefined
  );
  return {
    kind: 'waste_water',
    system,
    systemOther:
      system === 'other'
        ? typeof details.systemOther === 'string'
          ? details.systemOther.trim() || undefined
          : undefined
        : undefined,
    gallons:
      system === 'septic'
        ? typeof details.gallons === 'string'
          ? details.gallons.trim() || undefined
          : undefined
        : undefined,
    wasteLineExitPhotoId: details.wasteLineExitPhotoId,
    sewerBillPhotoId: details.sewerBillPhotoId,
    tankLocationPhotoId: details.tankLocationPhotoId,
    septicFieldPhotoId: details.septicFieldPhotoId,
    wasteLineExitDocumentId: details.wasteLineExitDocumentId,
    sewerBillDocumentId: details.sewerBillDocumentId,
    tankLocationDocumentId: details.tankLocationDocumentId,
    septicFieldDocumentId: details.septicFieldDocumentId,
    notes: details.notes,
  };
}

function normalizeElectricPanelDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'electric_panel') return defaultDetailsForType('electric_panel');
  return {
    kind: 'electric_panel',
    name: details.name,
    amperage: details.amperage,
    brand: details.brand,
    locationNotes: details.locationNotes,
    lastInspectedAtISO: details.lastInspectedAtISO,
    panelDistancePhotoId: details.panelDistancePhotoId,
    panelInsideCoverPhotoId: details.panelInsideCoverPhotoId,
    panelCircuitBreakersPhotoId: details.panelCircuitBreakersPhotoId,
    panelDistanceDocumentId: details.panelDistanceDocumentId,
    panelInsideCoverDocumentId: details.panelInsideCoverDocumentId,
    panelCircuitBreakersDocumentId: details.panelCircuitBreakersDocumentId,
  };
}

function normalizeWaterHeaterDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'water_heater') return defaultDetailsForType('water_heater');
  const fuelType = normalizeFuelType(
    typeof details.fuelType === 'string' ? details.fuelType : undefined
  );
  return {
    kind: 'water_heater',
    fuelType,
    fuelTypeOther:
      fuelType === 'other'
        ? typeof details.fuelTypeOther === 'string'
          ? details.fuelTypeOther.trim() || undefined
          : undefined
        : undefined,
    make: typeof details.make === 'string' ? details.make.trim() || undefined : undefined,
    modelNumber:
      typeof details.modelNumber === 'string' ? details.modelNumber.trim() || undefined : undefined,
    serialNumber:
      typeof details.serialNumber === 'string' ? details.serialNumber.trim() || undefined : undefined,
    notes: typeof details.notes === 'string' ? details.notes.trim() || undefined : undefined,
    frontPhotoId: details.frontPhotoId,
    distancePhotoId: details.distancePhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    frontDocumentId: details.frontDocumentId,
    distanceDocumentId: details.distanceDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeSecuritySystemDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'security_system') return defaultDetailsForType('security_system');
  const systemType = normalizeSecuritySystemType(
    typeof details.systemType === 'string' ? details.systemType : undefined
  );
  return {
    kind: 'security_system',
    systemType,
    systemTypeOther:
      systemType === 'other'
        ? typeof details.systemTypeOther === 'string'
          ? details.systemTypeOther.trim() || undefined
          : undefined
        : undefined,
    monitoringCompany:
      typeof details.monitoringCompany === 'string'
        ? details.monitoringCompany.trim() || undefined
        : undefined,
    accountNumber:
      typeof details.accountNumber === 'string'
        ? details.accountNumber.trim() || undefined
        : undefined,
    monitoringPhone:
      typeof details.monitoringPhone === 'string'
        ? details.monitoringPhone.trim() || undefined
        : undefined,
    make: typeof details.make === 'string' ? details.make.trim() || undefined : undefined,
    modelNumber:
      typeof details.modelNumber === 'string' ? details.modelNumber.trim() || undefined : undefined,
    serialNumber:
      typeof details.serialNumber === 'string' ? details.serialNumber.trim() || undefined : undefined,
    panelLocation:
      typeof details.panelLocation === 'string'
        ? details.panelLocation.trim() || undefined
        : undefined,
    keypadLocation:
      typeof details.keypadLocation === 'string'
        ? details.keypadLocation.trim() || undefined
        : undefined,
    accessNotes:
      typeof details.accessNotes === 'string' ? details.accessNotes.trim() || undefined : undefined,
    installDateAtISO:
      typeof details.installDateAtISO === 'string'
        ? details.installDateAtISO.trim() || undefined
        : undefined,
    installerName:
      typeof details.installerName === 'string'
        ? details.installerName.trim() || undefined
        : undefined,
    installerPhone:
      typeof details.installerPhone === 'string'
        ? details.installerPhone.trim() || undefined
        : undefined,
    serviceCompany:
      typeof details.serviceCompany === 'string'
        ? details.serviceCompany.trim() || undefined
        : undefined,
    servicePhone:
      typeof details.servicePhone === 'string'
        ? details.servicePhone.trim() || undefined
        : undefined,
    notes: typeof details.notes === 'string' ? details.notes.trim() || undefined : undefined,
    controlPanelPhotoId: details.controlPanelPhotoId,
    keypadPhotoId: details.keypadPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    controlPanelDocumentId: details.controlPanelDocumentId,
    keypadDocumentId: details.keypadDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeRadonMitigationDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'radon_mitigation') return defaultDetailsForType('radon_mitigation');
  const systemType = normalizeRadonMitigationSystemType(
    typeof details.systemType === 'string' ? details.systemType : undefined
  );
  return {
    kind: 'radon_mitigation',
    systemType,
    systemTypeOther:
      systemType === 'other'
        ? typeof details.systemTypeOther === 'string'
          ? details.systemTypeOther.trim() || undefined
          : undefined
        : undefined,
    fanMake: typeof details.fanMake === 'string' ? details.fanMake.trim() || undefined : undefined,
    fanModel:
      typeof details.fanModel === 'string' ? details.fanModel.trim() || undefined : undefined,
    fanSerialNumber:
      typeof details.fanSerialNumber === 'string'
        ? details.fanSerialNumber.trim() || undefined
        : undefined,
    fanLocation:
      typeof details.fanLocation === 'string' ? details.fanLocation.trim() || undefined : undefined,
    suctionPointLocation:
      typeof details.suctionPointLocation === 'string'
        ? details.suctionPointLocation.trim() || undefined
        : undefined,
    dischargeLocation:
      typeof details.dischargeLocation === 'string'
        ? details.dischargeLocation.trim() || undefined
        : undefined,
    manometerReading:
      typeof details.manometerReading === 'string'
        ? details.manometerReading.trim() || undefined
        : undefined,
    lastTestDateAtISO:
      typeof details.lastTestDateAtISO === 'string'
        ? details.lastTestDateAtISO.trim() || undefined
        : undefined,
    lastTestResult:
      typeof details.lastTestResult === 'string'
        ? details.lastTestResult.trim() || undefined
        : undefined,
    installDateAtISO:
      typeof details.installDateAtISO === 'string'
        ? details.installDateAtISO.trim() || undefined
        : undefined,
    installerName:
      typeof details.installerName === 'string'
        ? details.installerName.trim() || undefined
        : undefined,
    installerPhone:
      typeof details.installerPhone === 'string'
        ? details.installerPhone.trim() || undefined
        : undefined,
    serviceCompany:
      typeof details.serviceCompany === 'string'
        ? details.serviceCompany.trim() || undefined
        : undefined,
    servicePhone:
      typeof details.servicePhone === 'string'
        ? details.servicePhone.trim() || undefined
        : undefined,
    notes: typeof details.notes === 'string' ? details.notes.trim() || undefined : undefined,
    fanPhotoId: details.fanPhotoId,
    manometerPhotoId: details.manometerPhotoId,
    dischargePhotoId: details.dischargePhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    fanDocumentId: details.fanDocumentId,
    manometerDocumentId: details.manometerDocumentId,
    dischargeDocumentId: details.dischargeDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeWellPumpDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'well_pump') return defaultDetailsForType('well_pump');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'well_pump',
    pumpMake: trim(details.pumpMake),
    pumpModel: trim(details.pumpModel),
    pumpSerialNumber: trim(details.pumpSerialNumber),
    wellDepth: trim(details.wellDepth),
    yieldGpm: trim(details.yieldGpm),
    pressureTankSize: trim(details.pressureTankSize),
    locationNotes: trim(details.locationNotes),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    pumpPhotoId: details.pumpPhotoId,
    pressureTankPhotoId: details.pressureTankPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    pumpDocumentId: details.pumpDocumentId,
    pressureTankDocumentId: details.pressureTankDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeGeneratorDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'generator') return defaultDetailsForType('generator');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  const fuelType = normalizeGeneratorFuelType(
    typeof details.fuelType === 'string' ? details.fuelType : undefined
  );
  return {
    kind: 'generator',
    fuelType,
    fuelTypeOther: fuelType === 'other' ? trim(details.fuelTypeOther) : undefined,
    make: trim(details.make),
    modelNumber: trim(details.modelNumber),
    serialNumber: trim(details.serialNumber),
    wattage: trim(details.wattage),
    transferSwitchLocation: trim(details.transferSwitchLocation),
    runtimeHours: trim(details.runtimeHours),
    lastExerciseAtISO: trim(details.lastExerciseAtISO),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    generatorPhotoId: details.generatorPhotoId,
    transferSwitchPhotoId: details.transferSwitchPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    generatorDocumentId: details.generatorDocumentId,
    transferSwitchDocumentId: details.transferSwitchDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeSumpPumpDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'sump_pump') return defaultDetailsForType('sump_pump');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'sump_pump',
    pumpRole: normalizeSumpPumpRole(
      typeof details.pumpRole === 'string' ? details.pumpRole : undefined
    ),
    make: trim(details.make),
    modelNumber: trim(details.modelNumber),
    serialNumber: trim(details.serialNumber),
    batteryBackupNotes: trim(details.batteryBackupNotes),
    dischargeLocation: trim(details.dischargeLocation),
    locationNotes: trim(details.locationNotes),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    pumpPhotoId: details.pumpPhotoId,
    dischargePhotoId: details.dischargePhotoId,
    batteryBackupPhotoId: details.batteryBackupPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    pumpDocumentId: details.pumpDocumentId,
    dischargeDocumentId: details.dischargeDocumentId,
    batteryBackupDocumentId: details.batteryBackupDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeGarageDoorDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'garage_door') return defaultDetailsForType('garage_door');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'garage_door',
    openerMake: trim(details.openerMake),
    openerModel: trim(details.openerModel),
    openerSerialNumber: trim(details.openerSerialNumber),
    springType: trim(details.springType),
    programmingNotes: trim(details.programmingNotes),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    doorPhotoId: details.doorPhotoId,
    openerPhotoId: details.openerPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    doorDocumentId: details.doorDocumentId,
    openerDocumentId: details.openerDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeRoofDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'roof') return defaultDetailsForType('roof');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  const material = normalizeRoofMaterial(
    typeof details.material === 'string' ? details.material : undefined
  );
  return {
    kind: 'roof',
    material,
    materialOther: material === 'other' ? trim(details.materialOther) : undefined,
    color: trim(details.color),
    installDateAtISO: trim(details.installDateAtISO),
    warrantyExpiresAtISO: trim(details.warrantyExpiresAtISO),
    lastInspectedAtISO: trim(details.lastInspectedAtISO),
    contractorName: trim(details.contractorName),
    contractorPhone: trim(details.contractorPhone),
    notes: trim(details.notes),
    overviewPhotoId: details.overviewPhotoId,
    detailPhotoId: details.detailPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    overviewDocumentId: details.overviewDocumentId,
    detailDocumentId: details.detailDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizePoolDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'pool') return defaultDetailsForType('pool');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  const poolType = normalizePoolType(
    typeof details.poolType === 'string' ? details.poolType : undefined
  );
  return {
    kind: 'pool',
    poolType,
    poolTypeOther: poolType === 'other' ? trim(details.poolTypeOther) : undefined,
    volumeGallons: trim(details.volumeGallons),
    filterMake: trim(details.filterMake),
    filterModel: trim(details.filterModel),
    pumpMake: trim(details.pumpMake),
    pumpModel: trim(details.pumpModel),
    heaterType: trim(details.heaterType),
    chemicalNotes: trim(details.chemicalNotes),
    installDateAtISO: trim(details.installDateAtISO),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    overviewPhotoId: details.overviewPhotoId,
    equipmentPadPhotoId: details.equipmentPadPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    overviewDocumentId: details.overviewDocumentId,
    equipmentPadDocumentId: details.equipmentPadDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeIrrigationDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'irrigation') return defaultDetailsForType('irrigation');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'irrigation',
    controllerMake: trim(details.controllerMake),
    controllerModel: trim(details.controllerModel),
    zoneCount: trim(details.zoneCount),
    backflowLocation: trim(details.backflowLocation),
    winterizeNotes: trim(details.winterizeNotes),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    controllerPhotoId: details.controllerPhotoId,
    backflowPhotoId: details.backflowPhotoId,
    zoneValvePhotoId: details.zoneValvePhotoId,
    receiptPhotoId: details.receiptPhotoId,
    controllerDocumentId: details.controllerDocumentId,
    backflowDocumentId: details.backflowDocumentId,
    zoneValveDocumentId: details.zoneValveDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeEvChargerDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'ev_charger') return defaultDetailsForType('ev_charger');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'ev_charger',
    make: trim(details.make),
    modelNumber: trim(details.modelNumber),
    serialNumber: trim(details.serialNumber),
    amperage: trim(details.amperage),
    connectorType: trim(details.connectorType),
    circuitBreaker: trim(details.circuitBreaker),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    notes: trim(details.notes),
    chargerPhotoId: details.chargerPhotoId,
    breakerPanelPhotoId: details.breakerPanelPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    chargerDocumentId: details.chargerDocumentId,
    breakerPanelDocumentId: details.breakerPanelDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeSolarDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'solar') return defaultDetailsForType('solar');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'solar',
    systemSizeKw: trim(details.systemSizeKw),
    panelMake: trim(details.panelMake),
    panelModel: trim(details.panelModel),
    panelCount: trim(details.panelCount),
    inverterMake: trim(details.inverterMake),
    inverterModel: trim(details.inverterModel),
    inverterSerialNumber: trim(details.inverterSerialNumber),
    productionAccountNotes: trim(details.productionAccountNotes),
    installDateAtISO: trim(details.installDateAtISO),
    installerName: trim(details.installerName),
    installerPhone: trim(details.installerPhone),
    warrantyNotes: trim(details.warrantyNotes),
    notes: trim(details.notes),
    panelsPhotoId: details.panelsPhotoId,
    inverterPhotoId: details.inverterPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    panelsDocumentId: details.panelsDocumentId,
    inverterDocumentId: details.inverterDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeHotTubDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'hot_tub') return defaultDetailsForType('hot_tub');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'hot_tub',
    make: trim(details.make),
    modelNumber: trim(details.modelNumber),
    serialNumber: trim(details.serialNumber),
    capacityPersons: trim(details.capacityPersons),
    filterModel: trim(details.filterModel),
    heaterType: trim(details.heaterType),
    chemicalNotes: trim(details.chemicalNotes),
    installDateAtISO: trim(details.installDateAtISO),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    notes: trim(details.notes),
    overviewPhotoId: details.overviewPhotoId,
    equipmentPhotoId: details.equipmentPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    overviewDocumentId: details.overviewDocumentId,
    equipmentDocumentId: details.equipmentDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeWaterTreatmentDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'water_treatment') return defaultDetailsForType('water_treatment');
  const legacy = details as WaterTreatmentDetails & { provider?: string };
  const filterName =
    typeof details.filterName === 'string'
      ? details.filterName.trim() || undefined
      : typeof legacy.provider === 'string'
        ? legacy.provider.trim() || undefined
        : undefined;
  return {
    kind: 'water_treatment',
    systemType:
      typeof details.systemType === 'string' ? details.systemType.trim() || undefined : undefined,
    filterName,
    notes: typeof details.notes === 'string' ? details.notes.trim() || undefined : undefined,
    waterFilterPhotoId: details.waterFilterPhotoId,
    replacementFilterPhotoId: details.replacementFilterPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    waterFilterDocumentId: details.waterFilterDocumentId,
    replacementFilterDocumentId: details.replacementFilterDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeAirConditionerDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'air_conditioner') return defaultDetailsForType('air_conditioner');
  return {
    kind: 'air_conditioner',
    acType: details.acType,
    make: typeof details.make === 'string' ? details.make.trim() || undefined : undefined,
    modelNumber:
      typeof details.modelNumber === 'string' ? details.modelNumber.trim() || undefined : undefined,
    serialNumber:
      typeof details.serialNumber === 'string' ? details.serialNumber.trim() || undefined : undefined,
    tonnage: typeof details.tonnage === 'string' ? details.tonnage.trim() || undefined : undefined,
    refrigerantType:
      typeof details.refrigerantType === 'string'
        ? details.refrigerantType.trim() || undefined
        : undefined,
    filterSize:
      typeof details.filterSize === 'string' ? details.filterSize.trim() || undefined : undefined,
    locationNotes:
      typeof details.locationNotes === 'string'
        ? details.locationNotes.trim() || undefined
        : undefined,
    installDateAtISO: details.installDateAtISO,
    installCost:
      typeof details.installCost === 'string' ? details.installCost.trim() || undefined : undefined,
    installerName:
      typeof details.installerName === 'string'
        ? details.installerName.trim() || undefined
        : undefined,
    installerPhone:
      typeof details.installerPhone === 'string'
        ? details.installerPhone.trim() || undefined
        : undefined,
    serviceCompany:
      typeof details.serviceCompany === 'string'
        ? details.serviceCompany.trim() || undefined
        : undefined,
    servicePhone:
      typeof details.servicePhone === 'string'
        ? details.servicePhone.trim() || undefined
        : undefined,
    notes: typeof details.notes === 'string' ? details.notes.trim() || undefined : undefined,
    acUnitPhotoId: details.acUnitPhotoId,
    manufacturerTagPhotoId: details.manufacturerTagPhotoId,
    receiptPhotoId: details.receiptPhotoId,
    acUnitDocumentId: details.acUnitDocumentId,
    manufacturerTagDocumentId: details.manufacturerTagDocumentId,
    receiptDocumentId: details.receiptDocumentId,
  };
}

function normalizeAutomobileDetails(details: ItemDetails): ItemDetails {
  if (details.kind !== 'automobile') return defaultDetailsForType('automobile');
  const trim = (value?: string) =>
    typeof value === 'string' ? value.trim() || undefined : undefined;
  return {
    kind: 'automobile',
    nickname: trim(details.nickname),
    year: trim(details.year),
    make: trim(details.make),
    model: trim(details.model),
    trim: trim(details.trim),
    vin: trim(details.vin),
    licensePlate: trim(details.licensePlate),
    color: trim(details.color),
    purchaseDateAtISO: details.purchaseDateAtISO,
    purchasePrice: trim(details.purchasePrice),
    purchaseLocation: trim(details.purchaseLocation),
    purchaseMileage: trim(details.purchaseMileage),
    currentMileage: trim(details.currentMileage),
    oilType: trim(details.oilType),
    oilFilter: trim(details.oilFilter),
    tireSize: trim(details.tireSize),
    serviceCompany: trim(details.serviceCompany),
    servicePhone: trim(details.servicePhone),
    insuranceCompany: trim(details.insuranceCompany),
    insurancePhone: trim(details.insurancePhone),
    insurancePolicyNumber: trim(details.insurancePolicyNumber),
    notes: trim(details.notes),
    vehiclePhotoId: details.vehiclePhotoId,
    vinTagPhotoId: details.vinTagPhotoId,
    titlePhotoId: details.titlePhotoId,
    registrationPhotoId: details.registrationPhotoId,
    insuranceCardPhotoId: details.insuranceCardPhotoId,
    windowStickerPhotoId: details.windowStickerPhotoId,
    purchaseReceiptPhotoId: details.purchaseReceiptPhotoId,
    vehicleDocumentId: details.vehicleDocumentId,
    vinTagDocumentId: details.vinTagDocumentId,
    titleDocumentId: details.titleDocumentId,
    registrationDocumentId: details.registrationDocumentId,
    insuranceCardDocumentId: details.insuranceCardDocumentId,
    windowStickerDocumentId: details.windowStickerDocumentId,
    purchaseReceiptDocumentId: details.purchaseReceiptDocumentId,
  };
}

function exclusiveItemDetails(itemTypeId: ItemTypeId, details: ItemDetails): ItemDetails {
  if (details.kind === 'appliance') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      APPLIANCE_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'electric_panel') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      ELECTRIC_PANEL_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'water_heater') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      WATER_HEATER_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'security_system') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      SECURITY_SYSTEM_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'radon_mitigation') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      RADON_MITIGATION_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'well_pump') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      WELL_PUMP_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'generator') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      GENERATOR_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'sump_pump') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      SUMP_PUMP_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'garage_door') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      GARAGE_DOOR_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'roof') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      ROOF_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'pool') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      POOL_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'irrigation') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      IRRIGATION_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'ev_charger') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      EV_CHARGER_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'solar') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      SOLAR_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  if (details.kind === 'hot_tub') {
    return enforceExclusiveSlots(
      details as Record<string, string | undefined>,
      HOT_TUB_PHOTO_SLOTS.map((slot) => slot.key)
    ) as ItemDetails;
  }
  return details;
}

function normalizeDetails(itemTypeId: ItemTypeId, details: ItemDetails): ItemDetails {
  if (itemTypeId === 'furnace') return exclusiveItemDetails(itemTypeId, normalizeFurnaceDetails(details));
  if (itemTypeId === 'air_conditioner') {
    return exclusiveItemDetails(itemTypeId, normalizeAirConditionerDetails(details));
  }
  if (itemTypeId === 'automobile') {
    return exclusiveItemDetails(itemTypeId, normalizeAutomobileDetails(details));
  }
  if (itemTypeId === 'water_main') return exclusiveItemDetails(itemTypeId, normalizeWaterMainDetails(details));
  if (itemTypeId === 'waste_water') {
    return exclusiveItemDetails(itemTypeId, normalizeWasteWaterDetails(details));
  }
  if (itemTypeId === 'electric_panel') {
    return exclusiveItemDetails(itemTypeId, normalizeElectricPanelDetails(details));
  }
  if (itemTypeId === 'water_heater') {
    return exclusiveItemDetails(itemTypeId, normalizeWaterHeaterDetails(details));
  }
  if (itemTypeId === 'security_system') {
    return exclusiveItemDetails(itemTypeId, normalizeSecuritySystemDetails(details));
  }
  if (itemTypeId === 'radon_mitigation') {
    return exclusiveItemDetails(itemTypeId, normalizeRadonMitigationDetails(details));
  }
  if (itemTypeId === 'well_pump') {
    return exclusiveItemDetails(itemTypeId, normalizeWellPumpDetails(details));
  }
  if (itemTypeId === 'generator') {
    return exclusiveItemDetails(itemTypeId, normalizeGeneratorDetails(details));
  }
  if (itemTypeId === 'sump_pump') {
    return exclusiveItemDetails(itemTypeId, normalizeSumpPumpDetails(details));
  }
  if (itemTypeId === 'garage_door') {
    return exclusiveItemDetails(itemTypeId, normalizeGarageDoorDetails(details));
  }
  if (itemTypeId === 'roof') {
    return exclusiveItemDetails(itemTypeId, normalizeRoofDetails(details));
  }
  if (itemTypeId === 'pool') {
    return exclusiveItemDetails(itemTypeId, normalizePoolDetails(details));
  }
  if (itemTypeId === 'irrigation') {
    return exclusiveItemDetails(itemTypeId, normalizeIrrigationDetails(details));
  }
  if (itemTypeId === 'ev_charger') {
    return exclusiveItemDetails(itemTypeId, normalizeEvChargerDetails(details));
  }
  if (itemTypeId === 'solar') {
    return exclusiveItemDetails(itemTypeId, normalizeSolarDetails(details));
  }
  if (itemTypeId === 'hot_tub') {
    return exclusiveItemDetails(itemTypeId, normalizeHotTubDetails(details));
  }
  if (itemTypeId === 'water_treatment') {
    return exclusiveItemDetails(itemTypeId, normalizeWaterTreatmentDetails(details));
  }
  const expectedKind = itemTypeId === 'other' ? 'other' : itemTypeId;
  if (details.kind === expectedKind) {
    return exclusiveItemDetails(itemTypeId, details);
  }
  return defaultDetailsForType(itemTypeId);
}

function normalizeItem(raw: InventoryItem): InventoryItem {
  const itemTypeId = raw.itemTypeId ?? 'other';
  return {
    id: raw.id,
    roomId: raw.roomId,
    itemTypeId,
    displayName: raw.displayName,
    details: normalizeDetails(itemTypeId, raw.details ?? defaultDetailsForType(itemTypeId)),
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
    documentIds: Array.isArray(raw.documentIds) ? raw.documentIds : [],
    hiddenPhotoSlotKeys: normalizeHiddenPhotoSlotKeys(raw.hiddenPhotoSlotKeys),
    createdAtISO: raw.createdAtISO ?? new Date().toISOString(),
    updatedAtISO: raw.updatedAtISO ?? raw.createdAtISO ?? new Date().toISOString(),
  };
}

function normalizeEvent(raw: ItemEvent): ItemEvent {
  return ensureUpdatedAt({
    ...raw,
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
  });
}

function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  if (!raw || raw.version !== 1) return { ...EMPTY_APP_STATE };

  const properties = Array.isArray(raw.properties) ? raw.properties : [];
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];
  const items = (Array.isArray(raw.items) ? raw.items : []).map(normalizeItem);
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  const propertyPhotos = Array.isArray(raw.propertyPhotos) ? raw.propertyPhotos : [];
  const roomPhotos = Array.isArray(raw.roomPhotos) ? raw.roomPhotos : [];
  const documents = Array.isArray(raw.documents) ? raw.documents : [];
  const events = (Array.isArray(raw.events) ? raw.events : []).map(normalizeEvent);
  const projects = Array.isArray(raw.projects) ? raw.projects : [];
  const projectVendors = Array.isArray(raw.projectVendors) ? raw.projectVendors : [];
  const projectPhotos = Array.isArray(raw.projectPhotos) ? raw.projectPhotos : [];
  const vendorPhotos = Array.isArray(raw.vendorPhotos) ? raw.vendorPhotos : [];
  const vendorInteractions = Array.isArray(raw.vendorInteractions) ? raw.vendorInteractions : [];
  const propertyTodos = Array.isArray(raw.propertyTodos) ? raw.propertyTodos : [];
  const projectPunchItems = Array.isArray(raw.projectPunchItems) ? raw.projectPunchItems : [];

  const validDocumentIds = new Set(
    documents
      .filter(
        (doc) =>
          doc &&
          typeof doc.id === 'string' &&
          typeof doc.localUri === 'string' &&
          typeof doc.fileName === 'string'
      )
      .map((doc) => doc.id)
  );
  const cleanDocuments = documents.filter((doc) => validDocumentIds.has(doc.id));

  const propertyIds = new Set(properties.map((p) => p.id));
  const cleanPropertyTodosDraft = propertyTodos.filter((t) => propertyIds.has(t.propertyId));
  const todoIds = new Set(cleanPropertyTodosDraft.map((t) => t.id));
  const cleanPropertyPhotos = propertyPhotos.filter(
    (p) => propertyIds.has(p.propertyId) && (!p.todoId || todoIds.has(p.todoId))
  );
  const validPropertyPhotoIds = new Set(cleanPropertyPhotos.map((p) => p.id));
  const cleanProperties = properties.map((p) => {
    const legacy = p as Property & { coverPhotoId?: string };
    const frontPhotoId =
      p.frontPhotoId ??
      (legacy.coverPhotoId && validPropertyPhotoIds.has(legacy.coverPhotoId)
        ? legacy.coverPhotoId
        : undefined);
    const validSlot = (id?: string) =>
      id && validPropertyPhotoIds.has(id) ? id : undefined;
    const front = validSlot(frontPhotoId);
    const left = validSlot(p.leftSidePhotoId);
    const right = validSlot(p.rightSidePhotoId);
    const back = validSlot(p.backPhotoId);
    const fieldCard = validSlot(p.fieldCardPhotoId);
    const plotPlan = validSlot(p.plotPlanPhotoId);
    const slotPhotoIds = new Set(
      [front, left, right, back, fieldCard, plotPlan].filter((id): id is string => id != null)
    );
    const validDocument = (id?: string) =>
      id && validDocumentIds.has(id) ? id : undefined;
    let propertyRecord = {
      ...p,
      frontPhotoId: front,
      leftSidePhotoId: left,
      rightSidePhotoId: right,
      backPhotoId: back,
      fieldCardPhotoId: fieldCard,
      plotPlanPhotoId: plotPlan,
      frontDocumentId: validDocument(p.frontDocumentId),
      leftSideDocumentId: validDocument(p.leftSideDocumentId),
      rightSideDocumentId: validDocument(p.rightSideDocumentId),
      backDocumentId: validDocument(p.backDocumentId),
      fieldCardDocumentId: validDocument(p.fieldCardDocumentId),
      plotPlanDocumentId: validDocument(p.plotPlanDocumentId),
      photoIds: (Array.isArray(p.photoIds) ? p.photoIds : []).filter(
        (id) =>
          validPropertyPhotoIds.has(id) &&
          !slotPhotoIds.has(id) &&
          cleanPropertyPhotos.some((photo) => photo.id === id && !photo.todoId)
      ),
      hiddenPhotoSlotKeys: normalizeHiddenPhotoSlotKeys(p.hiddenPhotoSlotKeys),
    };
    for (const slot of PROPERTY_PHOTO_SLOTS) {
      const docKey = documentIdKeyForPhotoSlot(slot.key) as keyof Property;
      if (propertyRecord[slot.key] && propertyRecord[docKey]) {
        propertyRecord = { ...propertyRecord, [docKey]: undefined };
      }
    }
    return propertyRecord;
  });
  const roomIds = new Set(rooms.filter((r) => propertyIds.has(r.propertyId)).map((r) => r.id));
  const cleanRoomPhotos = roomPhotos.filter((p) => roomIds.has(p.roomId));
  const validRoomPhotoIds = new Set(cleanRoomPhotos.map((p) => p.id));
  const cleanRooms = rooms
    .filter((r) => propertyIds.has(r.propertyId))
    .map((r) => {
      const slotAttachments = r.slotAttachments ?? {};
      const cleanedAttachments: Room['slotAttachments'] = {};
      for (const [key, attachment] of Object.entries(slotAttachments)) {
        if (!attachment || typeof attachment.id !== 'string') continue;
        if (attachment.kind === 'document' && !validDocumentIds.has(attachment.id)) continue;
        if (attachment.kind === 'photo' && !validRoomPhotoIds.has(attachment.id)) continue;
        cleanedAttachments[key as keyof typeof cleanedAttachments] = attachment;
      }
      return {
        ...r,
        requiresAuth: r.requiresAuth === true,
        slotAttachments: cleanedAttachments,
        photoIds: (Array.isArray(r.photoIds) ? r.photoIds : []).filter((id) =>
          validRoomPhotoIds.has(id)
        ),
        hiddenPhotoSlotKeys: normalizeHiddenPhotoSlotKeys(r.hiddenPhotoSlotKeys),
      };
    });
  const itemIds = new Set(items.filter((i) => roomIds.has(i.roomId)).map((i) => i.id));
  const eventIds = new Set(events.filter((e) => itemIds.has(e.itemId)).map((e) => e.id));

  const cleanItems = items.filter((i) => roomIds.has(i.roomId));
  const cleanEvents = events.filter((e) => itemIds.has(e.itemId));
  const cleanPhotos = photos.filter(
    (p) => itemIds.has(p.itemId) && (!p.eventId || eventIds.has(p.eventId))
  );

  const cleanProjects = projects
    .filter((p) => propertyIds.has(p.propertyId))
    .map((p) => ({
      ...p,
      status: p.status ?? 'research',
      photoIds: (Array.isArray(p.photoIds) ? p.photoIds : []).filter((id) =>
        projectPhotos.some((photo) => photo.id === id && !photo.punchItemId)
      ),
    }));
  const projectIds = new Set(cleanProjects.map((p) => p.id));
  const cleanProjectPunchItemsDraft = projectPunchItems.filter((item) =>
    projectIds.has(item.projectId)
  );
  const punchItemIds = new Set(cleanProjectPunchItemsDraft.map((item) => item.id));
  const cleanProjectPhotos = projectPhotos.filter(
    (p) =>
      projectIds.has(p.projectId) && (!p.punchItemId || punchItemIds.has(p.punchItemId))
  );
  const validProjectPhotoIds = new Set(cleanProjectPhotos.map((p) => p.id));
  const cleanProjectsWithPhotos = cleanProjects.map((p) => ({
    ...p,
    photoIds: p.photoIds.filter(
      (id) =>
        validProjectPhotoIds.has(id) &&
        cleanProjectPhotos.some((photo) => photo.id === id && !photo.punchItemId)
    ),
  }));

  const cleanProjectPunchItems = cleanProjectPunchItemsDraft.map((item) => {
    const ownedIds = cleanProjectPhotos
      .filter((p) => p.punchItemId === item.id)
      .map((p) => p.id);
    const ownedSet = new Set(ownedIds);
    const ordered = (Array.isArray(item.photoIds) ? item.photoIds : []).filter((id) =>
      ownedSet.has(id)
    );
    const orderedSet = new Set(ordered);
    return {
      ...item,
      title: typeof item.title === 'string' ? item.title : '',
      done: item.done === true,
      photoIds: [...ordered, ...ownedIds.filter((id) => !orderedSet.has(id))],
    };
  });

  const cleanProjectVendors = projectVendors
    .filter((v) => projectIds.has(v.projectId))
    .map((v) => ({
      ...v,
      status: v.status ?? 'researching',
      photoIds: (Array.isArray(v.photoIds) ? v.photoIds : []).filter((id) =>
        vendorPhotos.some((photo) => photo.id === id)
      ),
      documentIds: (Array.isArray(v.documentIds) ? v.documentIds : []).filter((id) =>
        validDocumentIds.has(id)
      ),
    }));
  const vendorIds = new Set(cleanProjectVendors.map((v) => v.id));
  const cleanVendorInteractionsDraft = vendorInteractions.filter((i) => {
    if (i.vendorId) return vendorIds.has(i.vendorId);
    if (typeof i.propertyId === 'string' && i.propertyId) {
      return propertyIds.has(i.propertyId);
    }
    return false;
  });
  const interactionIds = new Set(cleanVendorInteractionsDraft.map((i) => i.id));
  const cleanVendorPhotos = vendorPhotos.filter((p) => {
    if (p.interactionId) {
      if (!interactionIds.has(p.interactionId)) return false;
      if (p.vendorId && !vendorIds.has(p.vendorId)) return false;
      return true;
    }
    return Boolean(p.vendorId && vendorIds.has(p.vendorId));
  });
  const validVendorPhotoIds = new Set(cleanVendorPhotos.map((p) => p.id));
  const cleanProjectVendorsFinal = cleanProjectVendors.map((v) => ({
    ...v,
    photoIds: v.photoIds.filter(
      (id) =>
        validVendorPhotoIds.has(id) &&
        cleanVendorPhotos.some((p) => p.id === id && !p.interactionId)
    ),
  }));
  const cleanVendorInteractions = cleanVendorInteractionsDraft.map((i) => {
    // Rebuild photoIds from photo.interactionId ownership so links lost in
    // older saves or partial imports are repaired; existing order is kept.
    const ownedIds = cleanVendorPhotos
      .filter((p) => p.interactionId === i.id)
      .map((p) => p.id);
    const ownedSet = new Set(ownedIds);
    const ordered = (Array.isArray(i.photoIds) ? i.photoIds : []).filter((id) =>
      ownedSet.has(id)
    );
    const orderedSet = new Set(ordered);
    return {
      ...i,
      vendorId: i.vendorId || undefined,
      projectId:
        typeof i.projectId === 'string' && i.projectId && projectIds.has(i.projectId)
          ? i.projectId
          : undefined,
      propertyId: typeof i.propertyId === 'string' && i.propertyId ? i.propertyId : undefined,
      important: i.important === true ? true : undefined,
      photoIds: [...ordered, ...ownedIds.filter((id) => !orderedSet.has(id))],
    };
  });

  const cleanPropertyTodos = cleanPropertyTodosDraft.map((todo) => {
    const ownedIds = cleanPropertyPhotos.filter((p) => p.todoId === todo.id).map((p) => p.id);
    const ownedSet = new Set(ownedIds);
    const ordered = (Array.isArray(todo.photoIds) ? todo.photoIds : []).filter((id) =>
      ownedSet.has(id)
    );
    const orderedSet = new Set(ordered);
    const repeatMonthsRaw = todo.repeatMonths;
    const repeatMonths =
      typeof repeatMonthsRaw === 'number' &&
      Number.isFinite(repeatMonthsRaw) &&
      repeatMonthsRaw >= 1
        ? Math.floor(repeatMonthsRaw)
        : undefined;
    return {
      ...todo,
      kind: (todo.kind === 'idea' ? 'idea' : 'todo') as PropertyTodoKind,
      title: typeof todo.title === 'string' ? todo.title : '',
      done: todo.done === true,
      repeatMonths,
      photoIds: [...ordered, ...ownedIds.filter((id) => !orderedSet.has(id))],
    };
  });

  const remapUri = <T extends { localUri: string }>(item: T): T => ({
    ...item,
    localUri: resolveAppFileUri(item.localUri),
  });

  return {
    version: 1,
    properties: cleanProperties.map(ensureUpdatedAt),
    rooms: cleanRooms.map(ensureUpdatedAt),
    items: cleanItems.map((i) => ({
      ...ensureUpdatedAt(i),
      photoIds: i.photoIds.filter((pid) =>
        cleanPhotos.some((p) => p.id === pid && !p.eventId)
      ),
      documentIds: (i.documentIds ?? []).filter((id) => validDocumentIds.has(id)),
    })),
    photos: cleanPhotos.map(remapUri).map(ensureUpdatedAt),
    propertyPhotos: cleanPropertyPhotos.map(remapUri).map(ensureUpdatedAt),
    roomPhotos: cleanRoomPhotos.map(remapUri).map(ensureUpdatedAt),
    documents: cleanDocuments.map(remapUri).map(ensureUpdatedAt),
    events: cleanEvents.map((e) => ({
      ...ensureUpdatedAt(e),
      photoIds: e.photoIds.filter((pid) => cleanPhotos.some((p) => p.id === pid)),
    })),
    projects: cleanProjectsWithPhotos.map(ensureUpdatedAt),
    projectVendors: cleanProjectVendorsFinal.map(ensureUpdatedAt),
    projectPhotos: cleanProjectPhotos.map(remapUri).map(ensureUpdatedAt),
    vendorPhotos: cleanVendorPhotos.map(remapUri).map(ensureUpdatedAt),
    vendorInteractions: cleanVendorInteractions.map(ensureUpdatedAt),
    propertyTodos: cleanPropertyTodos.map(ensureUpdatedAt),
    projectPunchItems: cleanProjectPunchItems.map(ensureUpdatedAt),
  };
}

function withStoredMediaUris(state: AppState): AppState {
  const storeUri = <T extends { localUri: string }>(item: T): T => ({
    ...item,
    localUri: toStoredAppFileUri(item.localUri),
  });
  return {
    ...state,
    photos: state.photos.map(storeUri),
    propertyPhotos: state.propertyPhotos.map(storeUri),
    roomPhotos: state.roomPhotos.map(storeUri),
    projectPhotos: state.projectPhotos.map(storeUri),
    vendorPhotos: state.vendorPhotos.map(storeUri),
    documents: state.documents.map(storeUri),
  };
}

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_APP_STATE };
    try {
      return normalizeState(JSON.parse(raw) as AppState);
    } catch {
      return { ...EMPTY_APP_STATE };
    }
  } catch {
    return { ...EMPTY_APP_STATE };
  }
}

export async function saveAppState(state: AppState): Promise<AppState> {
  let prev: AppState = { ...EMPTY_APP_STATE };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      prev = normalizeState(JSON.parse(raw) as AppState);
    }
  } catch {
    prev = { ...EMPTY_APP_STATE };
  }
  const stamped = stampChangedRecords(prev, state, nowISO());
  await recordInferredDeletions(prev, stamped);
  const normalized = normalizeState(stamped);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withStoredMediaUris(normalized)));
  return normalized;
}

export function propertyById(state: AppState, id: string): Property | undefined {
  return state.properties.find((p) => p.id === id);
}

export function roomsForProperty(state: AppState, propertyId: string): Room[] {
  return state.rooms
    .filter((r) => r.propertyId === propertyId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function roomById(state: AppState, id: string): Room | undefined {
  return state.rooms.find((r) => r.id === id);
}

function compareInventoryItemsForList(a: InventoryItem, b: InventoryItem): number {
  const typeCompare = catalogLabel(a.itemTypeId).localeCompare(
    catalogLabel(b.itemTypeId),
    undefined,
    { sensitivity: 'base' }
  );
  if (typeCompare !== 0) return typeCompare;
  const nameCompare = (itemCustomName(a) ?? '').localeCompare(itemCustomName(b) ?? '', undefined, {
    sensitivity: 'base',
  });
  if (nameCompare !== 0) return nameCompare;
  return a.createdAtISO.localeCompare(b.createdAtISO);
}

export function itemsForRoom(state: AppState, roomId: string): InventoryItem[] {
  return state.items.filter((i) => i.roomId === roomId).sort(compareInventoryItemsForList);
}

/** All inventory assets across every property, sorted like room lists. */
export function allItems(state: AppState): InventoryItem[] {
  return [...state.items].sort(compareInventoryItemsForList);
}

export function itemById(state: AppState, id: string): InventoryItem | undefined {
  return state.items.find((i) => i.id === id);
}

/** Item-level photos only (not tied to a service event). */
export function photosForItem(state: AppState, itemId: string): ItemPhoto[] {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return [];
  return item.photoIds
    .map((photoId) => state.photos.find((p) => p.id === photoId))
    .filter((p): p is ItemPhoto => p != null && !p.eventId);
}

export function photosForEvent(state: AppState, eventId: string): ItemPhoto[] {
  const event = state.events.find((e) => e.id === eventId);
  if (!event) return [];
  return event.photoIds
    .map((photoId) => state.photos.find((p) => p.id === photoId))
    .filter((p): p is ItemPhoto => p != null);
}

/** First item-level photo URI for list thumbnails (appliance slot order, else photoIds order). */
export function firstPhotoUriForItem(state: AppState, item: InventoryItem): string | undefined {
  const itemPhotos = state.photos.filter((p) => p.itemId === item.id && !p.eventId);
  if (itemPhotos.length === 0) return undefined;

  if (item.itemTypeId === 'appliance' && item.details.kind === 'appliance') {
    for (const slot of APPLIANCE_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'electric_panel' && item.details.kind === 'electric_panel') {
    for (const slot of ELECTRIC_PANEL_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'water_heater' && item.details.kind === 'water_heater') {
    for (const slot of WATER_HEATER_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'security_system' && item.details.kind === 'security_system') {
    for (const slot of SECURITY_SYSTEM_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'radon_mitigation' && item.details.kind === 'radon_mitigation') {
    for (const slot of RADON_MITIGATION_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'well_pump' && item.details.kind === 'well_pump') {
    for (const slot of WELL_PUMP_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'generator' && item.details.kind === 'generator') {
    for (const slot of GENERATOR_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'sump_pump' && item.details.kind === 'sump_pump') {
    for (const slot of SUMP_PUMP_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'garage_door' && item.details.kind === 'garage_door') {
    for (const slot of GARAGE_DOOR_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'roof' && item.details.kind === 'roof') {
    for (const slot of ROOF_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'pool' && item.details.kind === 'pool') {
    for (const slot of POOL_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'irrigation' && item.details.kind === 'irrigation') {
    for (const slot of IRRIGATION_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'ev_charger' && item.details.kind === 'ev_charger') {
    for (const slot of EV_CHARGER_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'solar' && item.details.kind === 'solar') {
    for (const slot of SOLAR_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  if (item.itemTypeId === 'hot_tub' && item.details.kind === 'hot_tub') {
    for (const slot of HOT_TUB_PHOTO_SLOTS) {
      const photoId = item.details[slot.key];
      if (photoId) {
        const photo = itemPhotos.find((p) => p.id === photoId);
        if (photo) return photo.localUri;
      }
    }
  }

  for (const photoId of item.photoIds) {
    const photo = itemPhotos.find((p) => p.id === photoId);
    if (photo) return photo.localUri;
  }

  return itemPhotos[0]?.localUri;
}

export function eventsForItem(state: AppState, itemId: string): ItemEvent[] {
  return state.events
    .filter((e) => e.itemId === itemId)
    .sort((a, b) => b.occurredAtISO.localeCompare(a.occurredAtISO));
}

/** Past/today service logs for history lists (excludes future-dated events). */
export function serviceHistoryEventsForItem(state: AppState, itemId: string): ItemEvent[] {
  return eventsForItem(state, itemId).filter((e) => !isAfterToday(e.occurredAtISO));
}

export function itemsForProperty(state: AppState, propertyId: string): InventoryItem[] {
  const roomIds = new Set(roomsForProperty(state, propertyId).map((r) => r.id));
  return state.items.filter((i) => roomIds.has(i.roomId)).sort(compareInventoryItemsForList);
}

/** Display/sort date for services lists — same field as list/detail UI. */
function eventListSortKey(event: ItemEvent): string {
  return serviceListDateISO(event);
}

function sortEventsNewestFirst(events: ItemEvent[]): ItemEvent[] {
  return [...events].sort((a, b) => {
    const byDate = eventListSortKey(b).localeCompare(eventListSortKey(a));
    if (byDate !== 0) return byDate;
    const aSecondary = a.updatedAtISO ?? a.occurredAtISO;
    const bSecondary = b.updatedAtISO ?? b.occurredAtISO;
    return bSecondary.localeCompare(aSecondary);
  });
}

/** All item service events across every property, newest first by display date. */
export function allItemEvents(state: AppState): ItemEvent[] {
  return sortEventsNewestFirst(state.events);
}

export function eventsForProperty(state: AppState, propertyId: string): ItemEvent[] {
  const itemIds = new Set(itemsForProperty(state, propertyId).map((i) => i.id));
  return sortEventsNewestFirst(state.events.filter((e) => itemIds.has(e.itemId)));
}

/** All item service events for assets in a room, newest first by display date. */
export function eventsForRoom(state: AppState, roomId: string): ItemEvent[] {
  const itemIds = new Set(itemsForRoom(state, roomId).map((i) => i.id));
  return sortEventsNewestFirst(state.events.filter((e) => itemIds.has(e.itemId)));
}

export function nextRoomSortOrder(state: AppState, propertyId: string): number {
  const rooms = roomsForProperty(state, propertyId);
  if (rooms.length === 0) return 0;
  return Math.max(...rooms.map((r) => r.sortOrder)) + 1;
}

export function projectsForProperty(state: AppState, propertyId: string): Project[] {
  return state.projects
    .filter((p) => p.propertyId === propertyId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function projectById(state: AppState, id: string): Project | undefined {
  return state.projects.find((p) => p.id === id);
}

export function vendorsForProject(state: AppState, projectId: string): ProjectVendor[] {
  return state.projectVendors
    .filter((v) => v.projectId === projectId)
    .sort((a, b) => a.name.localeCompare(b.name) || a.createdAtISO.localeCompare(b.createdAtISO));
}

export function vendorById(state: AppState, id: string): ProjectVendor | undefined {
  return state.projectVendors.find((v) => v.id === id);
}

export function interactionsForVendor(state: AppState, vendorId: string): VendorInteraction[] {
  return state.vendorInteractions
    .filter((i) => i.vendorId === vendorId)
    .sort((a, b) => b.occurredAtISO.localeCompare(a.occurredAtISO));
}

/** Resolve the property for an interaction (explicit propertyId, project, or vendor → project). */
export function propertyIdForInteraction(
  state: AppState,
  interaction: VendorInteraction
): string | undefined {
  if (interaction.propertyId) return interaction.propertyId;
  if (interaction.projectId) {
    const fromProject = projectById(state, interaction.projectId)?.propertyId;
    if (fromProject) return fromProject;
  }
  if (!interaction.vendorId) return undefined;
  const vendor = vendorById(state, interaction.vendorId);
  if (!vendor) return undefined;
  return projectById(state, vendor.projectId)?.propertyId;
}

/** Resolve project for an interaction (explicit projectId or via vendor). */
export function projectIdForInteraction(
  state: AppState,
  interaction: VendorInteraction
): string | undefined {
  if (interaction.projectId) return interaction.projectId;
  if (!interaction.vendorId) return undefined;
  return vendorById(state, interaction.vendorId)?.projectId;
}

/** All vendor interactions across every property, newest first. */
export function allVendorInteractions(state: AppState): VendorInteraction[] {
  return sortInteractionsNewestFirst(state.vendorInteractions);
}

/** All interactions for a property (vendor-linked + property-scoped), newest first. */
export function interactionsForProperty(
  state: AppState,
  propertyId: string
): VendorInteraction[] {
  const projectIds = new Set(projectsForProperty(state, propertyId).map((p) => p.id));
  const vendorIds = new Set(
    state.projectVendors.filter((v) => projectIds.has(v.projectId)).map((v) => v.id)
  );
  return sortInteractionsNewestFirst(
    state.vendorInteractions.filter((i) => {
      if (i.propertyId === propertyId) return true;
      if (i.projectId && projectIds.has(i.projectId)) return true;
      return Boolean(i.vendorId && vendorIds.has(i.vendorId));
    })
  );
}

/** Vendor interactions for a single project, newest first. */
export function interactionsForProject(
  state: AppState,
  projectId: string
): VendorInteraction[] {
  const vendorIds = new Set(
    state.projectVendors.filter((v) => v.projectId === projectId).map((v) => v.id)
  );
  return sortInteractionsNewestFirst(
    state.vendorInteractions.filter(
      (i) =>
        i.projectId === projectId || Boolean(i.vendorId && vendorIds.has(i.vendorId))
    )
  );
}

function sortInteractionsNewestFirst(
  interactions: VendorInteraction[]
): VendorInteraction[] {
  return [...interactions].sort((a, b) => {
    const byOccurred = b.occurredAtISO.localeCompare(a.occurredAtISO);
    if (byOccurred !== 0) return byOccurred;
    const aSecondary = a.updatedAtISO ?? a.createdAtISO;
    const bSecondary = b.updatedAtISO ?? b.createdAtISO;
    return bSecondary.localeCompare(aSecondary);
  });
}

export function photosForVendorInteraction(
  state: AppState,
  interactionId: string
): VendorPhoto[] {
  // Ownership comes from photo.interactionId; the interaction's photoIds array
  // only provides ordering. This keeps photos visible even if photoIds was
  // lost (e.g. records merged from an import while the interaction survived).
  const owned = state.vendorPhotos.filter((p) => p.interactionId === interactionId);
  if (owned.length === 0) return [];
  const interaction = state.vendorInteractions.find((i) => i.id === interactionId);
  const byId = new Map(owned.map((p) => [p.id, p]));
  const ordered: VendorPhoto[] = [];
  for (const id of interaction?.photoIds ?? []) {
    const photo = byId.get(id);
    if (photo) {
      ordered.push(photo);
      byId.delete(id);
    }
  }
  return [...ordered, ...byId.values()];
}

export function vendorInteractionById(
  state: AppState,
  id: string
): VendorInteraction | undefined {
  return state.vendorInteractions.find((i) => i.id === id);
}

export function todosForProperty(state: AppState, propertyId: string): PropertyTodo[] {
  return state.propertyTodos
    .filter((todo) => todo.propertyId === propertyId && todo.kind !== 'idea')
    .slice()
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const aDue = a.dueAtISO ?? '\uffff';
      const bDue = b.dueAtISO ?? '\uffff';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.createdAtISO.localeCompare(b.createdAtISO);
    });
}

export function ideasForProperty(state: AppState, propertyId: string): PropertyTodo[] {
  return state.propertyTodos
    .filter((todo) => todo.propertyId === propertyId && todo.kind === 'idea')
    .slice()
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const aDue = a.dueAtISO ?? '\uffff';
      const bDue = b.dueAtISO ?? '\uffff';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.createdAtISO.localeCompare(b.createdAtISO);
    });
}

export function propertyTodoById(state: AppState, id: string): PropertyTodo | undefined {
  return state.propertyTodos.find((todo) => todo.id === id);
}

export function photosForPropertyTodo(state: AppState, todoId: string): PropertyPhoto[] {
  const owned = state.propertyPhotos.filter((p) => p.todoId === todoId);
  if (owned.length === 0) return [];
  const todo = state.propertyTodos.find((t) => t.id === todoId);
  const byId = new Map(owned.map((p) => [p.id, p]));
  const ordered: PropertyPhoto[] = [];
  for (const id of todo?.photoIds ?? []) {
    const photo = byId.get(id);
    if (photo) {
      ordered.push(photo);
      byId.delete(id);
    }
  }
  return [...ordered, ...byId.values()];
}

export function deletePropertyTodoCascade(state: AppState, todoId: string): AppState {
  return {
    ...state,
    propertyTodos: state.propertyTodos.filter((t) => t.id !== todoId),
    propertyPhotos: state.propertyPhotos.filter((p) => p.todoId !== todoId),
  };
}

export function punchItemsForProject(state: AppState, projectId: string): ProjectPunchItem[] {
  return state.projectPunchItems
    .filter((item) => item.projectId === projectId)
    .slice()
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const aDue = a.dueAtISO ?? '\uffff';
      const bDue = b.dueAtISO ?? '\uffff';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.createdAtISO.localeCompare(b.createdAtISO);
    });
}

export function projectPunchItemById(
  state: AppState,
  id: string
): ProjectPunchItem | undefined {
  return state.projectPunchItems.find((item) => item.id === id);
}

export function photosForPunchItem(state: AppState, punchItemId: string): ProjectPhoto[] {
  const owned = state.projectPhotos.filter((p) => p.punchItemId === punchItemId);
  if (owned.length === 0) return [];
  const item = state.projectPunchItems.find((t) => t.id === punchItemId);
  const byId = new Map(owned.map((p) => [p.id, p]));
  const ordered: ProjectPhoto[] = [];
  for (const id of item?.photoIds ?? []) {
    const photo = byId.get(id);
    if (photo) {
      ordered.push(photo);
      byId.delete(id);
    }
  }
  return [...ordered, ...byId.values()];
}

export function deletePunchItemCascade(state: AppState, punchItemId: string): AppState {
  return {
    ...state,
    projectPunchItems: state.projectPunchItems.filter((item) => item.id !== punchItemId),
    projectPhotos: state.projectPhotos.filter((p) => p.punchItemId !== punchItemId),
  };
}

export function nextProjectSortOrder(state: AppState, propertyId: string): number {
  const projects = projectsForProperty(state, propertyId);
  if (projects.length === 0) return 0;
  return Math.max(...projects.map((p) => p.sortOrder)) + 1;
}

export function deletePropertyCascade(state: AppState, propertyId: string): AppState {
  const roomIds = new Set(state.rooms.filter((r) => r.propertyId === propertyId).map((r) => r.id));
  const itemIds = new Set(state.items.filter((i) => roomIds.has(i.roomId)).map((i) => i.id));
  const projectIds = new Set(
    state.projects.filter((p) => p.propertyId === propertyId).map((p) => p.id)
  );
  const vendorIds = new Set(
    state.projectVendors.filter((v) => projectIds.has(v.projectId)).map((v) => v.id)
  );
  const dropInteractionIds = new Set(
    state.vendorInteractions
      .filter(
        (i) => i.propertyId === propertyId || (i.vendorId != null && vendorIds.has(i.vendorId))
      )
      .map((i) => i.id)
  );
  const dropDocumentIds = new Set<string>();
  for (const vendor of state.projectVendors) {
    if (vendorIds.has(vendor.id)) {
      for (const docId of vendor.documentIds ?? []) dropDocumentIds.add(docId);
    }
  }
  return {
    ...state,
    properties: state.properties.filter((p) => p.id !== propertyId),
    rooms: state.rooms.filter((r) => r.propertyId !== propertyId),
    items: state.items.filter((i) => !roomIds.has(i.roomId)),
    photos: state.photos.filter((p) => !itemIds.has(p.itemId)),
    propertyPhotos: state.propertyPhotos.filter((p) => p.propertyId !== propertyId),
    roomPhotos: state.roomPhotos.filter((p) => !roomIds.has(p.roomId)),
    events: state.events.filter((e) => !itemIds.has(e.itemId)),
    projects: state.projects.filter((p) => p.propertyId !== propertyId),
    projectVendors: state.projectVendors.filter((v) => !projectIds.has(v.projectId)),
    projectPhotos: state.projectPhotos.filter((p) => !projectIds.has(p.projectId)),
    vendorPhotos: state.vendorPhotos.filter(
      (p) =>
        !vendorIds.has(p.vendorId ?? '') &&
        !(p.interactionId != null && dropInteractionIds.has(p.interactionId))
    ),
    vendorInteractions: state.vendorInteractions.filter((i) => !dropInteractionIds.has(i.id)),
    propertyTodos: state.propertyTodos.filter((t) => t.propertyId !== propertyId),
    projectPunchItems: state.projectPunchItems.filter((item) => !projectIds.has(item.projectId)),
    documents: state.documents.filter((d) => !dropDocumentIds.has(d.id)),
  };
}

export function deleteRoomCascade(state: AppState, roomId: string): AppState {
  const itemIds = new Set(state.items.filter((i) => i.roomId === roomId).map((i) => i.id));
  return {
    ...state,
    rooms: state.rooms.filter((r) => r.id !== roomId),
    items: state.items.filter((i) => i.roomId !== roomId),
    photos: state.photos.filter((p) => !itemIds.has(p.itemId)),
    roomPhotos: state.roomPhotos.filter((p) => p.roomId !== roomId),
    events: state.events.filter((e) => !itemIds.has(e.itemId)),
  };
}

export function deleteItemCascade(state: AppState, itemId: string): AppState {
  const item = state.items.find((i) => i.id === itemId);
  const dropDocumentIds = new Set(item?.documentIds ?? []);
  return {
    ...state,
    items: state.items.filter((i) => i.id !== itemId),
    photos: state.photos.filter((p) => p.itemId !== itemId),
    documents: state.documents.filter((d) => !dropDocumentIds.has(d.id)),
    events: state.events.filter((e) => e.itemId !== itemId),
  };
}

export function deleteEventCascade(state: AppState, eventId: string): AppState {
  return {
    ...state,
    events: state.events.filter((e) => e.id !== eventId),
    photos: state.photos.filter((p) => p.eventId !== eventId),
  };
}

export function deleteVendorCascade(state: AppState, vendorId: string): AppState {
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  const dropDocumentIds = new Set(vendor?.documentIds ?? []);
  return {
    ...state,
    projectVendors: state.projectVendors.filter((v) => v.id !== vendorId),
    vendorPhotos: state.vendorPhotos.filter((p) => p.vendorId !== vendorId),
    vendorInteractions: state.vendorInteractions.filter((i) => i.vendorId !== vendorId),
    documents: state.documents.filter((d) => !dropDocumentIds.has(d.id)),
  };
}

export function deleteVendorInteractionCascade(state: AppState, interactionId: string): AppState {
  return {
    ...state,
    vendorInteractions: state.vendorInteractions.filter((i) => i.id !== interactionId),
    vendorPhotos: state.vendorPhotos.filter((p) => p.interactionId !== interactionId),
  };
}

export function deleteProjectCascade(state: AppState, projectId: string): AppState {
  const vendorIds = new Set(
    state.projectVendors.filter((v) => v.projectId === projectId).map((v) => v.id)
  );
  const dropDocumentIds = new Set<string>();
  for (const vendor of state.projectVendors) {
    if (vendorIds.has(vendor.id)) {
      for (const docId of vendor.documentIds ?? []) dropDocumentIds.add(docId);
    }
  }
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== projectId),
    projectVendors: state.projectVendors.filter((v) => v.projectId !== projectId),
    projectPhotos: state.projectPhotos.filter((p) => p.projectId !== projectId),
    vendorPhotos: state.vendorPhotos.filter(
      (p) => !(p.vendorId != null && vendorIds.has(p.vendorId))
    ),
    vendorInteractions: state.vendorInteractions.filter(
      (i) =>
        i.projectId !== projectId && !(i.vendorId != null && vendorIds.has(i.vendorId))
    ),
    projectPunchItems: state.projectPunchItems.filter((item) => item.projectId !== projectId),
    documents: state.documents.filter((d) => !dropDocumentIds.has(d.id)),
  };
}
