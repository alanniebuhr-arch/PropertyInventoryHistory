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
  | 'security_system'
  | 'radon_mitigation'
  | 'well_pump'
  | 'generator'
  | 'sump_pump'
  | 'garage_door'
  | 'roof'
  | 'pool'
  | 'irrigation'
  | 'ev_charger'
  | 'solar'
  | 'hot_tub'
  | 'other';

export type ElectricPanelDetails = {
  kind: 'electric_panel';
  name?: string;
  amperage?: string;
  brand?: string;
  locationNotes?: string;
  notes?: string;
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
  /** Septic tank capacity in gallons. */
  gallons?: string;
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
  notes?: string;
};

export type WaterHeaterDetails = {
  kind: 'water_heater';
  fuelType?: FuelType;
  fuelTypeOther?: string;
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  notes?: string;
  frontPhotoId?: string;
  distancePhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  frontDocumentId?: string;
  distanceDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
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
  notes?: string;
};

export type SecuritySystemType = 'alarm' | 'cameras' | 'alarm_and_cameras' | 'other';

export type SecuritySystemDetails = {
  kind: 'security_system';
  systemType?: SecuritySystemType;
  systemTypeOther?: string;
  monitoringCompany?: string;
  accountNumber?: string;
  monitoringPhone?: string;
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  panelLocation?: string;
  keypadLocation?: string;
  /** Codes, duress code reminders, app login notes, etc. */
  accessNotes?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  controlPanelPhotoId?: string;
  keypadPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  controlPanelDocumentId?: string;
  keypadDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type RadonMitigationSystemType =
  | 'sub_slab_suction'
  | 'crawl_space'
  | 'block_wall'
  | 'drain_tile'
  | 'other';

export type RadonMitigationDetails = {
  kind: 'radon_mitigation';
  systemType?: RadonMitigationSystemType;
  systemTypeOther?: string;
  fanMake?: string;
  fanModel?: string;
  fanSerialNumber?: string;
  fanLocation?: string;
  suctionPointLocation?: string;
  dischargeLocation?: string;
  manometerReading?: string;
  lastTestDateAtISO?: string;
  lastTestResult?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  fanPhotoId?: string;
  manometerPhotoId?: string;
  dischargePhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  fanDocumentId?: string;
  manometerDocumentId?: string;
  dischargeDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type WellPumpDetails = {
  kind: 'well_pump';
  pumpMake?: string;
  pumpModel?: string;
  pumpSerialNumber?: string;
  wellDepth?: string;
  yieldGpm?: string;
  pressureTankSize?: string;
  locationNotes?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  pumpPhotoId?: string;
  pressureTankPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  pumpDocumentId?: string;
  pressureTankDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type GeneratorFuelType = 'propane' | 'natural_gas' | 'diesel' | 'gasoline' | 'other';

export type GeneratorDetails = {
  kind: 'generator';
  fuelType?: GeneratorFuelType;
  fuelTypeOther?: string;
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  wattage?: string;
  transferSwitchLocation?: string;
  runtimeHours?: string;
  lastExerciseAtISO?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  generatorPhotoId?: string;
  transferSwitchPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  generatorDocumentId?: string;
  transferSwitchDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type SumpPumpRole = 'primary' | 'backup' | 'primary_and_backup';

export type SumpPumpDetails = {
  kind: 'sump_pump';
  pumpRole?: SumpPumpRole;
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  batteryBackupNotes?: string;
  dischargeLocation?: string;
  locationNotes?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  pumpPhotoId?: string;
  dischargePhotoId?: string;
  batteryBackupPhotoId?: string;
  receiptPhotoId?: string;
  pumpDocumentId?: string;
  dischargeDocumentId?: string;
  batteryBackupDocumentId?: string;
  receiptDocumentId?: string;
};

export type GarageDoorDetails = {
  kind: 'garage_door';
  openerMake?: string;
  openerModel?: string;
  openerSerialNumber?: string;
  springType?: string;
  programmingNotes?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  doorPhotoId?: string;
  openerPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  doorDocumentId?: string;
  openerDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type RoofMaterial = 'asphalt' | 'metal' | 'slate' | 'tile' | 'other';

export type RoofDetails = {
  kind: 'roof';
  material?: RoofMaterial;
  materialOther?: string;
  color?: string;
  installDateAtISO?: string;
  warrantyExpiresAtISO?: string;
  lastInspectedAtISO?: string;
  contractorName?: string;
  contractorPhone?: string;
  notes?: string;
  overviewPhotoId?: string;
  detailPhotoId?: string;
  receiptPhotoId?: string;
  overviewDocumentId?: string;
  detailDocumentId?: string;
  receiptDocumentId?: string;
};

export type PoolType = 'in_ground' | 'above_ground' | 'other';

export type PoolDetails = {
  kind: 'pool';
  poolType?: PoolType;
  poolTypeOther?: string;
  volumeGallons?: string;
  filterMake?: string;
  filterModel?: string;
  pumpMake?: string;
  pumpModel?: string;
  heaterType?: string;
  chemicalNotes?: string;
  installDateAtISO?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  overviewPhotoId?: string;
  equipmentPadPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  overviewDocumentId?: string;
  equipmentPadDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type IrrigationDetails = {
  kind: 'irrigation';
  controllerMake?: string;
  controllerModel?: string;
  zoneCount?: string;
  backflowLocation?: string;
  winterizeNotes?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  controllerPhotoId?: string;
  backflowPhotoId?: string;
  zoneValvePhotoId?: string;
  receiptPhotoId?: string;
  controllerDocumentId?: string;
  backflowDocumentId?: string;
  zoneValveDocumentId?: string;
  receiptDocumentId?: string;
};

export type EvChargerDetails = {
  kind: 'ev_charger';
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  amperage?: string;
  connectorType?: string;
  circuitBreaker?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  notes?: string;
  chargerPhotoId?: string;
  breakerPanelPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  chargerDocumentId?: string;
  breakerPanelDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type SolarDetails = {
  kind: 'solar';
  systemSizeKw?: string;
  panelMake?: string;
  panelModel?: string;
  panelCount?: string;
  inverterMake?: string;
  inverterModel?: string;
  inverterSerialNumber?: string;
  productionAccountNotes?: string;
  installDateAtISO?: string;
  installerName?: string;
  installerPhone?: string;
  warrantyNotes?: string;
  notes?: string;
  panelsPhotoId?: string;
  inverterPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  panelsDocumentId?: string;
  inverterDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
};

export type HotTubDetails = {
  kind: 'hot_tub';
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  capacityPersons?: string;
  filterModel?: string;
  heaterType?: string;
  chemicalNotes?: string;
  installDateAtISO?: string;
  serviceCompany?: string;
  servicePhone?: string;
  notes?: string;
  overviewPhotoId?: string;
  equipmentPhotoId?: string;
  manufacturerTagPhotoId?: string;
  receiptPhotoId?: string;
  overviewDocumentId?: string;
  equipmentDocumentId?: string;
  manufacturerTagDocumentId?: string;
  receiptDocumentId?: string;
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
  | SecuritySystemDetails
  | RadonMitigationDetails
  | WellPumpDetails
  | GeneratorDetails
  | SumpPumpDetails
  | GarageDoorDetails
  | RoofDetails
  | PoolDetails
  | IrrigationDetails
  | EvChargerDetails
  | SolarDetails
  | HotTubDetails
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
  /** Last local/content change; used for collaborative merge. */
  updatedAtISO?: string;
};

export type SlotAttachment =
  | { kind: 'photo'; id: string }
  | { kind: 'document'; id: string };

export type RoomSlotKey = 'houseInsurance';

export type PropertyPhoto = {
  id: string;
  propertyId: string;
  /** When set, photo belongs to a property to-do (not the property gallery). */
  todoId?: string;
  localUri: string;
  caption?: string;
  /** Free-form notes shown with the hero when this photo is active. */
  notes?: string;
  /** When true, included in the property Slideshow of favorite heroes. */
  favorite?: boolean;
  createdAtISO: string;
  updatedAtISO?: string;
};

export type RoomPhoto = {
  id: string;
  roomId: string;
  localUri: string;
  caption?: string;
  /** Free-form notes shown with the hero when this photo is active. */
  notes?: string;
  /** When true, included in the property Slideshow of favorite heroes. */
  favorite?: boolean;
  createdAtISO: string;
  updatedAtISO?: string;
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
  /** Named photo slots the user removed (placeholders stay hidden until restored). */
  hiddenPhotoSlotKeys?: string[];
  /**
   * Ordered photo ids for the property Slideshow (and Property Share favorites).
   * When undefined, Slideshow falls back to photos marked favorite in default order.
   */
  slideshowPhotoIds?: string[];
  createdAtISO: string;
  updatedAtISO?: string;
  /** Watermark of last successful Share updates / full property share for collaboration. */
  lastSharedAtISO?: string;
};

export type Room = {
  id: string;
  propertyId: string;
  name: string;
  sortOrder: number;
  photoIds: string[];
  requiresAuth?: boolean;
  slotAttachments?: Partial<Record<RoomSlotKey, SlotAttachment>>;
  /** Named photo slots the user removed (placeholders stay hidden until restored). */
  hiddenPhotoSlotKeys?: string[];
  updatedAtISO?: string;
};

export type InventoryItem = {
  id: string;
  roomId: string;
  itemTypeId: ItemTypeId;
  displayName?: string;
  details: ItemDetails;
  photoIds: string[];
  /** Extra documents beyond named photo-slot documents. */
  documentIds: string[];
  /** Named photo slots the user removed (placeholders stay hidden until restored). */
  hiddenPhotoSlotKeys?: string[];
  createdAtISO: string;
  updatedAtISO?: string;
};

export type ItemPhoto = {
  id: string;
  itemId: string;
  /** When set, photo belongs to a service event (receipt, parts, etc.). */
  eventId?: string;
  localUri: string;
  caption?: string;
  /** Free-form notes shown with the hero when this photo is active. */
  notes?: string;
  /** When true, included in the property Slideshow of favorite heroes. */
  favorite?: boolean;
  createdAtISO: string;
  updatedAtISO?: string;
};

export type ItemEventType =
  | 'maintenance'
  | 'inspection'
  | 'repair'
  | 'replacement'
  | 'improvement'
  | 'fuel_delivery'
  | 'other';

export type RecurrenceInterval =
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'every_2_years'
  | 'every_3_years'
  | 'custom'
  | 'once';

export type ItemEventRecurrence = {
  interval: RecurrenceInterval;
  intervalMonths?: number;
  nextDueAtISO?: string;
  /** Reminder notes shown on upcoming service cards. */
  notes?: string;
};

export type ItemEvent = {
  id: string;
  itemId: string;
  eventType: ItemEventType;
  title: string;
  occurredAtISO: string;
  notes?: string;
  /** Company that performed the service. */
  serviceCompany?: string;
  cost?: number;
  recurrence?: ItemEventRecurrence;
  photoIds: string[];
  updatedAtISO?: string;
};

export type VendorStatus =
  | 'researching'
  | 'initial_contact'
  | 'meeting_setup'
  | 'vendor_onsite'
  | 'waiting_for_quote'
  | 'quote_received'
  | 'accepted'
  | 'rejected';

export type ProjectStatus =
  | 'research'
  | 'interviewing_vendors'
  | 'in_progress'
  | 'complete';

export type Project = {
  id: string;
  propertyId: string;
  name: string;
  description?: string;
  /** Intro note sent to vendors (who you are, scope, timeframe). */
  vendorIntroNote?: string;
  /** Private notes — app-only; not included in intro share image. */
  vendorQuestionsNote?: string;
  status: ProjectStatus;
  /** Optional total / budgeted project cost. */
  totalCost?: number;
  photoIds: string[];
  sortOrder: number;
  createdAtISO: string;
  updatedAtISO?: string;
};

export type ProjectVendor = {
  id: string;
  projectId: string;
  name: string;
  contactName?: string;
  phone?: string;
  website?: string;
  status: VendorStatus;
  notes?: string;
  /** Summary of this company (quotes, strengths, overall impression). */
  companySummary?: string;
  photoIds: string[];
  documentIds: string[];
  createdAtISO: string;
  updatedAtISO?: string;
};

export type ProjectPhoto = {
  id: string;
  projectId: string;
  /** When set, photo belongs to a punch-list item (not the project gallery). */
  punchItemId?: string;
  localUri: string;
  caption?: string;
  notes?: string;
  favorite?: boolean;
  createdAtISO: string;
  updatedAtISO?: string;
};

export type VendorPhoto = {
  id: string;
  /** Optional when the photo belongs to a property-scoped (no-vendor) interaction. */
  vendorId?: string;
  /** When set, photo belongs to a vendor interaction (not the vendor gallery). */
  interactionId?: string;
  localUri: string;
  caption?: string;
  notes?: string;
  createdAtISO: string;
  updatedAtISO?: string;
};

export type VendorContactMethod =
  | 'website_quote'
  | 'text_message'
  | 'email'
  | 'phone_call'
  | 'in_person'
  | 'other';

export type VendorInteraction = {
  id: string;
  /** When set, interaction is tied to a project vendor. Omit for property-only contacts. */
  vendorId?: string;
  /**
   * Property this interaction belongs to. Required when vendorId is omitted.
   * Optional on legacy vendor-linked rows (inferred via vendor → project).
   */
  propertyId?: string;
  contactMethod: VendorContactMethod;
  /** Contact person (vendor contact, neighbor name, etc.). */
  contactName?: string;
  occurredAtISO: string;
  notes?: string;
  /** When true, emphasized in interaction lists and reminders. */
  important?: boolean;
  photoIds: string[];
  createdAtISO: string;
  updatedAtISO?: string;
};

export type PropertyTodoKind = 'todo' | 'idea';

export type PropertyTodo = {
  id: string;
  propertyId: string;
  /** 'todo' = actionable task, 'idea' = loosely thought-out topic. Missing = 'todo'. */
  kind?: PropertyTodoKind;
  title: string;
  dueAtISO?: string;
  /**
   * When set (e.g. 1 / 3 / 6 / 12), marking Done advances dueAtISO by this many months
   * and leaves the to-do open.
   */
  repeatMonths?: number;
  notes?: string;
  done: boolean;
  completedAtISO?: string;
  photoIds: string[];
  createdAtISO: string;
  updatedAtISO?: string;
};

/** Issue / completion checklist item for finishing a project. */
export type ProjectPunchItem = {
  id: string;
  projectId: string;
  title: string;
  dueAtISO?: string;
  notes?: string;
  done: boolean;
  completedAtISO?: string;
  photoIds: string[];
  createdAtISO: string;
  updatedAtISO?: string;
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
  projects: Project[];
  projectVendors: ProjectVendor[];
  projectPhotos: ProjectPhoto[];
  vendorPhotos: VendorPhoto[];
  vendorInteractions: VendorInteraction[];
  propertyTodos: PropertyTodo[];
  projectPunchItems: ProjectPunchItem[];
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
  projects: [],
  projectVendors: [],
  projectPhotos: [],
  vendorPhotos: [],
  vendorInteractions: [],
  propertyTodos: [],
  projectPunchItems: [],
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

/** Record IDs removed since the last share watermark, keyed by collection. */
export type SyncDeletedIds = {
  properties?: string[];
  rooms?: string[];
  items?: string[];
  photos?: string[];
  propertyPhotos?: string[];
  roomPhotos?: string[];
  documents?: string[];
  events?: string[];
  projects?: string[];
  projectVendors?: string[];
  projectPhotos?: string[];
  vendorPhotos?: string[];
  vendorInteractions?: string[];
  propertyTodos?: string[];
  projectPunchItems?: string[];
};

export type PropertyUpdateBundle = {
  formatVersion: 2;
  kind: 'property-update';
  exportedAtISO: string;
  sourceLabel?: string;
  propertyId: string;
  /** Watermark used when selecting changed records (omit = full property slice). */
  sinceISO?: string;
  state: AppState;
  deletedIds: SyncDeletedIds;
};
