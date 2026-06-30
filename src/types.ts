export type ItemTypeId =
  | 'gas_main'
  | 'water_main'
  | 'electric_panel'
  | 'internet'
  | 'furnace'
  | 'appliance'
  | 'other';

export type ElectricPanelDetails = {
  kind: 'electric_panel';
  amperage?: string;
  brand?: string;
  locationNotes?: string;
  lastInspectedAtISO?: string;
};

export type WaterMainDetails = {
  kind: 'water_main';
  shutoffLocation?: string;
  valveType?: string;
  meterNumber?: string;
};

export type GasMainDetails = {
  kind: 'gas_main';
  shutoffLocation?: string;
  provider?: string;
  meterNumber?: string;
};

export type InternetDetails = {
  kind: 'internet';
  isp?: string;
  accountNotes?: string;
  routerModel?: string;
  wifiSsid?: string;
};

export type FurnaceDetails = {
  kind: 'furnace';
  make?: string;
  fuelType?: string;
  modelNumber?: string;
  serialNumber?: string;
  filterSize?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
};

export type ApplianceDetails = {
  kind: 'appliance';
  nickname?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  facePhotoId?: string;
  manufacturerTagPhotoId?: string;
  insidePhotoId?: string;
  purchaseReceiptPhotoId?: string;
  purchaseLocation?: string;
  purchaseDateAtISO?: string;
  purchasePrice?: string;
  repairCompany?: string;
  repairPhone?: string;
  repairWebsite?: string;
};

export type OtherItemDetails = {
  kind: 'other';
  notes?: string;
};

export type ItemDetails =
  | ElectricPanelDetails
  | WaterMainDetails
  | GasMainDetails
  | InternetDetails
  | FurnaceDetails
  | ApplianceDetails
  | OtherItemDetails;

export type PropertyPhoto = {
  id: string;
  propertyId: string;
  localUri: string;
  createdAtISO: string;
};

export type RoomPhoto = {
  id: string;
  roomId: string;
  localUri: string;
  createdAtISO: string;
};

export type Property = {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  frontPhotoId?: string;
  leftSidePhotoId?: string;
  rightSidePhotoId?: string;
  backPhotoId?: string;
  createdAtISO: string;
};

export type Room = {
  id: string;
  propertyId: string;
  name: string;
  sortOrder: number;
  photoIds: string[];
};

export type InventoryItem = {
  id: string;
  roomId: string;
  itemTypeId: ItemTypeId;
  displayName?: string;
  details: ItemDetails;
  photoIds: string[];
  createdAtISO: string;
};

export type ItemPhoto = {
  id: string;
  itemId: string;
  /** When set, photo belongs to a service event (receipt, parts, etc.). */
  eventId?: string;
  localUri: string;
  caption?: string;
  createdAtISO: string;
};

export type ItemEventType = 'maintenance' | 'inspection' | 'repair' | 'replacement' | 'other';

export type RecurrenceInterval = 'monthly' | 'quarterly' | 'annual' | 'custom';

export type ItemEventRecurrence = {
  interval: RecurrenceInterval;
  intervalMonths?: number;
  nextDueAtISO?: string;
};

export type ItemEvent = {
  id: string;
  itemId: string;
  eventType: ItemEventType;
  title: string;
  occurredAtISO: string;
  notes?: string;
  cost?: number;
  recurrence?: ItemEventRecurrence;
  photoIds: string[];
};

export type AppState = {
  version: 1;
  properties: Property[];
  rooms: Room[];
  items: InventoryItem[];
  photos: ItemPhoto[];
  propertyPhotos: PropertyPhoto[];
  roomPhotos: RoomPhoto[];
  events: ItemEvent[];
};

export const EMPTY_APP_STATE: AppState = {
  version: 1,
  properties: [],
  rooms: [],
  items: [],
  photos: [],
  propertyPhotos: [],
  roomPhotos: [],
  events: [],
};

export type InventoryTransferBundle = {
  formatVersion: 1;
  kind: 'property-inventory';
  exportedAtISO: string;
  sourceLabel?: string;
  state: AppState;
  /** Present when user exports with photos embedded. */
  photoData?: Record<string, string>;
};
