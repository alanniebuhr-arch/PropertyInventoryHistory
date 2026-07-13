export type ItemTypeId =
  | 'gas_main'
  | 'water_main'
  | 'water_heater'
  | 'water_treatment'
  | 'waste_water'
  | 'electric_panel'
  | 'internet'
  | 'furnace'
  | 'air_conditioner'
  | 'automobile'
  | 'appliance'
  | 'other';

export type ElectricPanelDetails = {
  kind: 'electric_panel';
  name?: string;
  amperage?: string;
  brand?: string;
  locationNotes?: string;
  lastInspectedAtISO?: string;
  panelDistancePhotoId?: string;
  panelInsideCoverPhotoId?: string;
  panelCircuitBreakersPhotoId?: string;
  panelDistanceDocumentId?: string;
  panelInsideCoverDocumentId?: string;
  panelCircuitBreakersDocumentId?: string;
};

export type WaterSource = 'municipal' | 'well';

export type ValveType = 'ball_valve' | 'gate' | 'butterfly' | 'underground_municipal';

export type WaterMainDetails = {
  kind: 'water_main';
  waterSource?: WaterSource;
  shutoffLocation?: string;
  valveType?: ValveType;
  meterNumber?: string;
  wellHeadLocation?: string;
  mainValvePhotoId?: string;
  waterBillPhotoId?: string;
  undergroundShutoffPhotoId?: string;
  wellHeadPhotoId?: string;
  mainValveDocumentId?: string;
  waterBillDocumentId?: string;
  undergroundShutoffDocumentId?: string;
  wellHeadDocumentId?: string;
  notes?: string;
};

export type WasteWaterSystemType = 'sewer' | 'septic' | 'cesspool' | 'other';

export type WasteWaterDetails = {
  kind: 'waste_water';
  system?: WasteWaterSystemType;
  systemOther?: string;
  wasteLineExitPhotoId?: string;
  sewerBillPhotoId?: string;
  tankLocationPhotoId?: string;
  septicFieldPhotoId?: string;
  wasteLineExitDocumentId?: string;
  sewerBillDocumentId?: string;
  tankLocationDocumentId?: string;
  septicFieldDocumentId?: string;
  notes?: string;
};

export type GasMainDetails = {
  kind: 'gas_main';
  shutoffLocation?: string;
  provider?: string;
  meterNumber?: string;
};

export type WaterHeaterDetails = {
  kind: 'water_heater';
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  notes?: string;
};

export type WaterTreatmentDetails = {
  kind: 'water_treatment';
  systemType?: string;
  filterName?: string;
  notes?: string;
  waterFilterPhotoId?: string;
  replacementFilterPhotoId?: string;
  receiptPhotoId?: string;
  waterFilterDocumentId?: string;
  replacementFilterDocumentId?: string;
  receiptDocumentId?: string;
};

export type InternetDetails = {
  kind: 'internet';
  isp?: string;
  accountNotes?: string;
  routerModel?: string;
  wifiSsid?: string;
};

export type FuelType = 'natural_gas' | 'propane' | 'electric' | 'oil' | 'other';

export type HeatingSystemType = 'furnace' | 'boiler' | 'heat_pump';

export type HeatDistributionType = 'forced_air' | 'baseboard' | 'radiators' | 'other';

export type FurnaceDetails = {
  kind: 'furnace';
  systemType?: HeatingSystemType;
  heatDistribution?: HeatDistributionType;
  heatDistributionOther?: string;
  make?: string;
  fuelType?: FuelType;
  fuelTypeOther?: string;
  modelNumber?: string;
  serialNumber?: string;
  filterSize?: string;
  systemFrontPhotoId?: string;
  systemSidePhotoId?: string;
  systemTagPhotoId?: string;
  fuelShutoffPhotoId?: string;
  fuelTankPhotoId?: string;
  fuelTankLocation?: string;
  fuelTankSize?: string;
  receiptPhotoId?: string;
  systemFrontDocumentId?: string;
  systemSideDocumentId?: string;
  systemTagDocumentId?: string;
  fuelShutoffDocumentId?: string;
  fuelTankDocumentId?: string;
  receiptDocumentId?: string;
  installDateAtISO?: string;
  installCost?: string;
  installerName?: string;
  installerPhone?: string;
  notes?: string;
};

export type AcType = 'condenser' | 'heat_pump' | 'window_unit';

export type AirConditionerDetails = {
  kind: 'air_conditioner';
  acType?: AcType;
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  tonnage?: string;
  refrigerantType?: string;
  filterSize?: string;
  locationNotes?: string;
  installDateAtISO?: string;
  installCost?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  acUnitPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  acUnitDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type AutomobileDetails = {
  kind: 'automobile';
  nickname?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  licensePlate?: string;
  color?: string;
  purchaseDateAtISO?: string;
  purchasePrice?: string;
  purchaseLocation?: string;
  purchaseMileage?: string;
  currentMileage?: string;
  oilType?: string;
  oilFilter?: string;
  tireSize?: string;
  serviceCompany?: string;
  servicePhone?: string;
  insuranceCompany?: string;
  insurancePhone?: string;
  insurancePolicyNumber?: string;
  notes?: string;
  vehiclePhotoId?: string;
  vinTagPhotoId?: string;
  titlePhotoId?: string;
  registrationPhotoId?: string;
  insuranceCardPhotoId?: string;
  windowStickerPhotoId?: string;
  purchaseReceiptPhotoId?: string;
  vehicleDocumentId?: string;
  vinTagDocumentId?: string;
  titleDocumentId?: string;
  registrationDocumentId?: string;
  insuranceCardDocumentId?: string;
  windowStickerDocumentId?: string;
  purchaseReceiptDocumentId?: string;
};

export type ApplianceDetails = {
  kind: 'appliance';
  nickname?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  notes?: string;
  facePhotoId?: string;
  manufacturerTagPhotoId?: string;
  insidePhotoId?: string;
  purchaseReceiptPhotoId?: string;
  faceDocumentId?: string;
  manufacturerTagDocumentId?: string;
  insideDocumentId?: string;
  purchaseReceiptDocumentId?: string;
  purchaseLocation?: string;
  purchaseDateAtISO?: string;
  purchasePrice?: string;
  purchaseNotes?: string;
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
  | WaterHeaterDetails
  | WaterTreatmentDetails
  | WasteWaterDetails
  | GasMainDetails
  | InternetDetails
  | FurnaceDetails
  | AirConditionerDetails
  | AutomobileDetails
  | ApplianceDetails
  | OtherItemDetails;

export type StoredDocument = {
  id: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  createdAtISO: string;
};

export type SlotAttachment =
  | { kind: 'photo'; id: string }
  | { kind: 'document'; id: string };

export type RoomSlotKey = 'houseInsurance';

export type PropertyPhoto = {
  id: string;
  propertyId: string;
  localUri: string;
  caption?: string;
  createdAtISO: string;
};

export type RoomPhoto = {
  id: string;
  roomId: string;
  localUri: string;
  caption?: string;
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
  fieldCardPhotoId?: string;
  plotPlanPhotoId?: string;
  frontDocumentId?: string;
  leftSideDocumentId?: string;
  rightSideDocumentId?: string;
  backDocumentId?: string;
  fieldCardDocumentId?: string;
  plotPlanDocumentId?: string;
  /** Extra property photos beyond the named slots above. */
  photoIds?: string[];
  createdAtISO: string;
};

export type Room = {
  id: string;
  propertyId: string;
  name: string;
  sortOrder: number;
  photoIds: string[];
  requiresAuth?: boolean;
  slotAttachments?: Partial<Record<RoomSlotKey, SlotAttachment>>;
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

export type ItemEventType =
  | 'maintenance'
  | 'inspection'
  | 'repair'
  | 'replacement'
  | 'improvement'
  | 'fuel_delivery'
  | 'other';

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
  documents: StoredDocument[];
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
  documents: [],
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
