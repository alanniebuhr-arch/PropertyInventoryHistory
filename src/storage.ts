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
  Room,
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
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';

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
    createdAtISO: raw.createdAtISO ?? new Date().toISOString(),
  };
}

function normalizeEvent(raw: ItemEvent): ItemEvent {
  return {
    ...raw,
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
  };
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
  const cleanPropertyPhotos = propertyPhotos.filter((p) => propertyIds.has(p.propertyId));
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
        (id) => validPropertyPhotoIds.has(id) && !slotPhotoIds.has(id)
      ),
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
      };
    });
  const itemIds = new Set(items.filter((i) => roomIds.has(i.roomId)).map((i) => i.id));
  const eventIds = new Set(events.filter((e) => itemIds.has(e.itemId)).map((e) => e.id));

  const cleanItems = items.filter((i) => roomIds.has(i.roomId));
  const cleanEvents = events.filter((e) => itemIds.has(e.itemId));
  const cleanPhotos = photos.filter(
    (p) => itemIds.has(p.itemId) && (!p.eventId || eventIds.has(p.eventId))
  );

  return {
    version: 1,
    properties: cleanProperties,
    rooms: cleanRooms,
    items: cleanItems.map((i) => ({
      ...i,
      photoIds: i.photoIds.filter((pid) =>
        cleanPhotos.some((p) => p.id === pid && !p.eventId)
      ),
      documentIds: (i.documentIds ?? []).filter((id) => validDocumentIds.has(id)),
    })),
    photos: cleanPhotos,
    propertyPhotos: cleanPropertyPhotos,
    roomPhotos: cleanRoomPhotos,
    documents: cleanDocuments,
    events: cleanEvents.map((e) => ({
      ...e,
      photoIds: e.photoIds.filter((pid) => cleanPhotos.some((p) => p.id === pid)),
    })),
  };
}

export async function loadAppState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_APP_STATE };
  try {
    return normalizeState(JSON.parse(raw) as AppState);
  } catch {
    return { ...EMPTY_APP_STATE };
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
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

export function itemsForRoom(state: AppState, roomId: string): InventoryItem[] {
  return state.items
    .filter((i) => i.roomId === roomId)
    .sort((a, b) => {
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
    });
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

export function itemsForProperty(state: AppState, propertyId: string): InventoryItem[] {
  const roomIds = new Set(roomsForProperty(state, propertyId).map((r) => r.id));
  return state.items.filter((i) => roomIds.has(i.roomId));
}

export function eventsForProperty(state: AppState, propertyId: string): ItemEvent[] {
  const itemIds = new Set(itemsForProperty(state, propertyId).map((i) => i.id));
  return state.events.filter((e) => itemIds.has(e.itemId));
}

export function nextRoomSortOrder(state: AppState, propertyId: string): number {
  const rooms = roomsForProperty(state, propertyId);
  if (rooms.length === 0) return 0;
  return Math.max(...rooms.map((r) => r.sortOrder)) + 1;
}

export function deletePropertyCascade(state: AppState, propertyId: string): AppState {
  const roomIds = new Set(state.rooms.filter((r) => r.propertyId === propertyId).map((r) => r.id));
  const itemIds = new Set(state.items.filter((i) => roomIds.has(i.roomId)).map((i) => i.id));
  return {
    ...state,
    properties: state.properties.filter((p) => p.id !== propertyId),
    rooms: state.rooms.filter((r) => r.propertyId !== propertyId),
    items: state.items.filter((i) => !roomIds.has(i.roomId)),
    photos: state.photos.filter((p) => !itemIds.has(p.itemId)),
    propertyPhotos: state.propertyPhotos.filter((p) => p.propertyId !== propertyId),
    roomPhotos: state.roomPhotos.filter((p) => !roomIds.has(p.roomId)),
    events: state.events.filter((e) => !itemIds.has(e.itemId)),
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
