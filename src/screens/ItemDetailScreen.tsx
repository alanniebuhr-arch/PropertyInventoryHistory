import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTextScaleControls } from '../textScale';
import type { ScrollView as RNScrollView } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, AirConditionerDetails, ApplianceDetails, AutomobileDetails, ElectricPanelDetails, EvChargerDetails, FurnaceDetails, GarageDoorDetails, GeneratorDetails, HotTubDetails, InventoryItem, IrrigationDetails, ItemDetails, ItemPhoto, PoolDetails, RadonMitigationDetails, RoofDetails, SecuritySystemDetails, SolarDetails, SumpPumpDetails, ToiletDetails, WasteWaterDetails, WaterHeaterDetails, WaterMainDetails, WaterTreatmentDetails, WellPumpDetails } from '../types';
import { EventListRow } from '../components/ListRows';
import { UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { CollapsibleSectionTitle } from '../components/CollapsibleSectionTitle';
import { ItemDisplayView } from '../components/ItemDisplayView';
import {
  ApplianceDisplayView,
  type ApplianceEditingSection,
} from '../components/ApplianceDisplayView';
import { sharedStyles, colors } from '../theme';
import { withReorderedItemPhotoIds } from '../photoReorder';
import { formatCurrency, formatDisplayDate, uid, nowISO } from '../utils';
import {
  deleteItemCascade,
  eventsForItem,
  firstPhotoUriForItem,
  itemById,
  photosForEvent,
  photosForItem,
  propertyById,
  roomById,
  roomsForProperty,
  itemsForRoom,
  serviceHistoryEventsForItem,
} from '../storage';
import { catalogLabel, itemDisplayLabel } from '../itemCatalog';
import { isItemOverdue, serviceLastNextForItem } from '../itemMaintenance';
import {
  EVENT_TYPE_LABELS,
  filterUpcomingByHorizon,
  serviceListDateISO,
  upcomingHorizonLabel,
  upcomingServiceEvents,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { withReusePhotoMeta } from '../reuseExistingPhotos';
import { deleteDocumentFile } from '../documentStorage';
import { updateApplianceDetails } from '../appliancePhotos';
import { updateWaterMainDetails, applyWaterMainDetailsChange } from '../waterMainPhotos';
import { furnaceUsesFuelShutoff, furnaceUsesFuelTank } from '../furnaceSlots';
import { updateFurnaceDetails, applyFurnaceDetailsChange } from '../furnacePhotos';
import { updateWasteWaterDetails, applyWasteWaterDetailsChange } from '../wasteWaterPhotos';
import { updateElectricPanelDetails } from '../electricPanelPhotos';
import { updateWaterTreatmentDetails } from '../waterTreatmentPhotos';
import { updateWaterHeaterDetails } from '../waterHeaterPhotos';
import { updateAirConditionerDetails } from '../airConditionerPhotos';
import { updateAutomobileDetails } from '../automobilePhotos';
import { updateSecuritySystemDetails } from '../securitySystemPhotos';
import { updateRadonMitigationDetails } from '../radonMitigationPhotos';
import { updateWellPumpDetails } from '../wellPumpPhotos';
import { updateGeneratorDetails } from '../generatorPhotos';
import { updateSumpPumpDetails } from '../sumpPumpPhotos';
import { updateGarageDoorDetails } from '../garageDoorPhotos';
import { updateRoofDetails } from '../roofPhotos';
import { updatePoolDetails } from '../poolPhotos';
import { updateIrrigationDetails } from '../irrigationPhotos';
import { updateEvChargerDetails } from '../evChargerPhotos';
import { updateSolarDetails } from '../solarPhotos';
import { updateHotTubDetails } from '../hotTubPhotos';
import { updateToiletDetails } from '../toiletPhotos';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { WaterMainDisplayView } from '../components/WaterMainDisplayView';
import { WaterHeaterDisplayView } from '../components/WaterHeaterDisplayView';
import { WaterTreatmentDisplayView } from '../components/WaterTreatmentDisplayView';
import { ElectricPanelDisplayView } from '../components/ElectricPanelDisplayView';
import { FurnaceDisplayView } from '../components/FurnaceDisplayView';
import { AirConditionerDisplayView } from '../components/AirConditionerDisplayView';
import { AutomobileDisplayView } from '../components/AutomobileDisplayView';
import { WasteWaterDisplayView } from '../components/WasteWaterDisplayView';
import { SecuritySystemDisplayView } from '../components/SecuritySystemDisplayView';
import { RadonMitigationDisplayView } from '../components/RadonMitigationDisplayView';
import { WellPumpDisplayView } from '../components/WellPumpDisplayView';
import { GeneratorDisplayView } from '../components/GeneratorDisplayView';
import { SumpPumpDisplayView } from '../components/SumpPumpDisplayView';
import { GarageDoorDisplayView } from '../components/GarageDoorDisplayView';
import { RoofDisplayView } from '../components/RoofDisplayView';
import { PoolDisplayView } from '../components/PoolDisplayView';
import { IrrigationDisplayView } from '../components/IrrigationDisplayView';
import { EvChargerDisplayView } from '../components/EvChargerDisplayView';
import { SolarDisplayView } from '../components/SolarDisplayView';
import { HotTubDisplayView } from '../components/HotTubDisplayView';
import { ToiletDisplayView } from '../components/ToiletDisplayView';
import { ItemExportSheet } from '../components/ItemExportSheet';
import { SharePhotoModeModal } from '../components/SharePhotoModeModal';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { RoomNavigationDots } from '../components/RoomNavigationDots';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
} from '../components/PropertyGearNavItems';
import { ItemDetailScrollContext } from '../itemDetailScrollContext';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import {
  KeyboardDoneTextInputContext,
  useKeyboardDoneAccessory,
} from '../components/KeyboardDoneAccessory';
import { buildItemExportSnapshot, type ItemExportSnapshot } from '../itemExportContent';
import { hasFavoritePhotos, type SharePhotoMode } from '../sharePhotoMode';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, itemSnapshotToPdfDoc } from '../exportPdfHtml';
import { setItemPhotoFavorite } from '../photoMeta';

export function ItemDetailScreen(props: {
  state: AppState;
  itemId: string;
  startEditingSection?: ApplianceEditingSection;
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
  onGoToProperty: () => void;
  onAddInteraction: () => void;
  onAddServiceEvent: () => void;
  onSearchAssets: () => void;
  onSearchInteractions: () => void;
  onSearchServiceHistory: () => void;
  onSearchActivity?: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenItem: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
  onAddEvent: () => void;
  onEditEvent: (eventId: string) => void;
  onLogUpcomingService: (completeFromEventId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    itemId,
    startEditingSection,
    onBack,
    onNavigateItem,
    onGoToProperty,
    onAddInteraction,
    onAddServiceEvent,
    onSearchAssets,
    onSearchInteractions,
    onSearchServiceHistory,
    onSearchActivity,
    onOpenProject,
    onOpenItem,
    onAddEvent,
    onEditEvent,
    onLogUpcomingService,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const item = itemById(state, itemId);
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [exportSnapshot, setExportSnapshot] = useState<ItemExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [sharePhotoMode, setSharePhotoMode] = useState<SharePhotoMode>('all');
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReorderArrows, setShowReorderArrows] = useState(false);
  const textScaleControls = useTextScaleControls();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'itemDetailDone',
    // Item detail uses gesture-handler ScrollView; native InputAccessoryView often does not appear.
    variant: 'overlay',
  });
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [serviceHistoryExpanded, setServiceHistoryExpanded] = useState(false);
  const exportRef = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPropertyUpcomingHorizon().then((horizon) => {
      if (!cancelled) setUpcomingHorizon(horizon);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollFieldIntoView = useCallback(
    (windowY: number, height: number, kbHeight: number) => {
      const visibleBottom = Dimensions.get('window').height - kbHeight - insets.bottom - 24;
      const fieldBottom = windowY + height;
      if (fieldBottom > visibleBottom) {
        scrollRef.current?.scrollTo({
          y: scrollYRef.current + (fieldBottom - visibleBottom),
          animated: true,
        });
      }
    },
    [insets.bottom]
  );

  const handleFieldFocus = useCallback(
    (windowY: number, height: number) => {
      pendingFocusRef.current = { y: windowY, height };
      scrollFieldIntoView(windowY, height, keyboardHeight || 320);
    },
    [keyboardHeight, scrollFieldIntoView]
  );

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const kbHeight = e.endCoordinates.height;
        setKeyboardHeight(kbHeight);
        const pending = pendingFocusRef.current;
        if (pending) {
          scrollFieldIntoView(pending.y, pending.height, kbHeight);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        pendingFocusRef.current = null;
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFieldIntoView]);

  useEffect(() => {
    if (item) setDetails(item.details);
  }, [item?.id, item?.details]);

  const itemHasFavoritePhotos = useMemo(
    () => hasFavoritePhotos(photosForItem(state, itemId)),
    [itemId, state]
  );

  const runItemExport = useCallback(
    async (photoMode: SharePhotoMode = 'all', format: ShareFormat = DEFAULT_SHARE_FORMAT) => {
      const snapshot = buildItemExportSnapshot(state, itemId, { photoMode });
      if (!snapshot) {
        Alert.alert('Export failed', 'Could not build asset summary.');
        return;
      }
      setShareOptionsOpen(false);
      if (format === 'pdf') {
        setExporting(true);
        try {
          const html = await buildExportPdfHtml(itemSnapshotToPdfDoc(snapshot));
          await shareHtmlAsPdf(html, `Share ${snapshot.title}`);
        } finally {
          setExporting(false);
        }
        return;
      }
      setExportSnapshot(snapshot);
      setExporting(true);
    },
    [itemId, state]
  );

  const onSharePress = useCallback(() => {
    setSharePhotoMode('all');
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, []);

  useEffect(() => {
    if (!exportSnapshot || !exporting) return;

    let cancelled = false;
    // Give the on-screen sheet (and its images) time to lay out before capture.
    const timer = setTimeout(() => {
      void (async () => {
        await shareViewAsPng(exportRef, `Share ${exportSnapshot.title}`);
        if (!cancelled) {
          setExportSnapshot(null);
          setExporting(false);
        }
      })();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exportSnapshot, exporting]);

  const room = item ? roomById(state, item.roomId) : undefined;
  const property = room ? propertyById(state, room.propertyId) : undefined;
  const propertyId = room?.propertyId ?? '';
  const roomItems = room ? itemsForRoom(state, room.id) : [];
  const itemIndex = roomItems.findIndex((entry) => entry.id === itemId);
  const itemSwipeEnabled = roomItems.length > 1;

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
  } = usePropertyGearNav({
    state,
    propertyId,
    roomId: room?.id,
    runMenuAction,
    actions: {
      onAddInteraction,
      onAddServiceEvent,
      onSearchAssets,
      onSearchInteractions,
      onSearchServiceHistory,
      onSearchActivity,
      onOpenProject,
      onOpenItem,
      onSave,
    },
  });

  const goToNextItem = useCallback(() => {
    if (itemIndex < 0) return;
    const target = roomItems[itemIndex + 1];
    if (target) onNavigateItem(target.id);
  }, [itemIndex, onNavigateItem, roomItems]);

  const goToPrevItem = useCallback(() => {
    if (itemIndex < 0) return;
    const target = roomItems[itemIndex - 1];
    if (target) onNavigateItem(target.id);
  }, [itemIndex, onNavigateItem, roomItems]);

  const makeItemSwipeGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-28, 28])
        .onEnd((event) => {
          'worklet';
          if (event.translationX <= -56) {
            runOnJS(goToNextItem)();
          } else if (event.translationX >= 56) {
            runOnJS(goToPrevItem)();
          }
        }),
    [goToNextItem, goToPrevItem]
  );

  const itemSwipeGestureForHeader = useMemo(
    () => makeItemSwipeGesture(),
    [makeItemSwipeGesture]
  );
  const itemSwipeGestureForServiceHistory = useMemo(
    () => makeItemSwipeGesture(),
    [makeItemSwipeGesture]
  );

  if (!item || !details) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Asset not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const inv: InventoryItem = item;
  const isAppliance = inv.itemTypeId === 'appliance';
  const isWaterMain = inv.itemTypeId === 'water_main';
  const isWasteWater = inv.itemTypeId === 'waste_water';
  const isFurnace = inv.itemTypeId === 'furnace';
  const isAirConditioner = inv.itemTypeId === 'air_conditioner';
  const isAutomobile = inv.itemTypeId === 'automobile';
  const isElectricPanel = inv.itemTypeId === 'electric_panel';
  const isWaterHeater = inv.itemTypeId === 'water_heater';
  const isWaterTreatment = inv.itemTypeId === 'water_treatment';
  const isSecuritySystem = inv.itemTypeId === 'security_system';
  const isRadonMitigation = inv.itemTypeId === 'radon_mitigation';
  const isWellPump = inv.itemTypeId === 'well_pump';
  const isGenerator = inv.itemTypeId === 'generator';
  const isSumpPump = inv.itemTypeId === 'sump_pump';
  const isGarageDoor = inv.itemTypeId === 'garage_door';
  const isRoof = inv.itemTypeId === 'roof';
  const isPool = inv.itemTypeId === 'pool';
  const isIrrigation = inv.itemTypeId === 'irrigation';
  const isEvCharger = inv.itemTypeId === 'ev_charger';
  const isSolar = inv.itemTypeId === 'solar';
  const isHotTub = inv.itemTypeId === 'hot_tub';
  const isToilet = inv.itemTypeId === 'toilet';
  const applianceDetails = details.kind === 'appliance' ? details : null;
  const waterMainDetails = details.kind === 'water_main' ? details : null;
  const wasteWaterDetails = details.kind === 'waste_water' ? details : null;
  const furnaceDetails = details.kind === 'furnace' ? details : null;
  const airConditionerDetails = details.kind === 'air_conditioner' ? details : null;
  const automobileDetails = details.kind === 'automobile' ? details : null;
  const electricPanelDetails = details.kind === 'electric_panel' ? details : null;
  const waterHeaterDetails = details.kind === 'water_heater' ? details : null;
  const waterTreatmentDetails = details.kind === 'water_treatment' ? details : null;
  const securitySystemDetails = details.kind === 'security_system' ? details : null;
  const radonMitigationDetails = details.kind === 'radon_mitigation' ? details : null;
  const wellPumpDetails = details.kind === 'well_pump' ? details : null;
  const generatorDetails = details.kind === 'generator' ? details : null;
  const sumpPumpDetails = details.kind === 'sump_pump' ? details : null;
  const garageDoorDetails = details.kind === 'garage_door' ? details : null;
  const roofDetails = details.kind === 'roof' ? details : null;
  const poolDetails = details.kind === 'pool' ? details : null;
  const irrigationDetails = details.kind === 'irrigation' ? details : null;
  const evChargerDetails = details.kind === 'ev_charger' ? details : null;
  const solarDetails = details.kind === 'solar' ? details : null;
  const hotTubDetails = details.kind === 'hot_tub' ? details : null;
  const toiletDetails = details.kind === 'toilet' ? details : null;
  const photos = photosForItem(state, itemId);
  const events = eventsForItem(state, itemId);
  const historyEvents = serviceHistoryEventsForItem(state, itemId);
  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEvents(events),
    upcomingHorizon
  );
  const serviceLastNext = serviceLastNextForItem(state, itemId);
  const overdue = isItemOverdue(state, itemId);

  const itemPhotoHeaderContent = (
    <>
      <RoomNavigationDots
        count={roomItems.length}
        activeIndex={itemIndex}
        unitLabel="Asset"
        onSelect={(index) => {
          const target = roomItems[index];
          if (target) onNavigateItem(target.id);
        }}
      />
      <Text style={sharedStyles.title}>{itemDisplayLabel({ ...inv, details })}</Text>
      <Text style={sharedStyles.subtitle}>
        {[property?.name, room?.name, catalogLabel(inv.itemTypeId)].filter(Boolean).join(' · ')}
      </Text>
      {serviceLastNext ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 4,
          }}
        >
          {serviceLastNext.last ? (
            <Text style={sharedStyles.cardMeta}>Last service: {serviceLastNext.last}</Text>
          ) : (
            <View />
          )}
          {serviceLastNext.next ? (
            <Text
              style={[
                sharedStyles.cardMeta,
                { textAlign: 'right' },
                overdue && { color: colors.overdue, fontWeight: '600' },
              ]}
            >
              Next service: {serviceLastNext.next}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const itemPhotoHeader = itemSwipeEnabled ? (
    <GestureDetector gesture={itemSwipeGestureForHeader}>
      <View>{itemPhotoHeaderContent}</View>
    </GestureDetector>
  ) : (
    itemPhotoHeaderContent
  );

  function handleDetailsChange(next: ItemDetails) {
    setDetails(next);
    onSave({
      ...state,
      items: state.items.map((i) => (i.id === itemId ? { ...i, details: next } : i)),
    });
  }

  function handleDisplayNameChange(name: string) {
    onSave({
      ...state,
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, displayName: name.trim() || undefined } : i
      ),
    });
  }

  function handleApplianceDetailsChange(next: ApplianceDetails) {
    setDetails(next);
    onSave(updateApplianceDetails(state, itemId, next));
  }

  function handleWaterMainDetailsChange(next: WaterMainDetails) {
    if (waterMainDetails && next.waterSource !== waterMainDetails.waterSource) {
      void applyWaterMainDetailsChange(state, itemId, waterMainDetails, next).then((saved) => {
        const item = saved.items.find((i) => i.id === itemId);
        if (item?.details.kind === 'water_main') {
          setDetails(item.details);
        }
        onSave(saved);
      });
      return;
    }
    setDetails(next);
    onSave(updateWaterMainDetails(state, itemId, next));
  }

  function handleFurnaceDetailsChange(next: FurnaceDetails) {
    if (!furnaceDetails) return;
    const needsApply =
      next.systemType !== furnaceDetails.systemType ||
      furnaceUsesFuelTank(furnaceDetails.fuelType) !== furnaceUsesFuelTank(next.fuelType) ||
      furnaceUsesFuelShutoff(furnaceDetails.fuelType) !== furnaceUsesFuelShutoff(next.fuelType);
    if (needsApply) {
      void applyFurnaceDetailsChange(state, itemId, furnaceDetails, next).then((saved) => {
        const item = saved.items.find((i) => i.id === itemId);
        if (item?.details.kind === 'furnace') {
          setDetails(item.details);
        }
        onSave(saved);
      });
      return;
    }
    setDetails(next);
    onSave(updateFurnaceDetails(state, itemId, next));
  }

  function handleWasteWaterDetailsChange(next: WasteWaterDetails) {
    if (wasteWaterDetails && next.system !== wasteWaterDetails.system) {
      void applyWasteWaterDetailsChange(state, itemId, wasteWaterDetails, next).then((saved) => {
        const item = saved.items.find((i) => i.id === itemId);
        if (item?.details.kind === 'waste_water') {
          setDetails(item.details);
        }
        onSave(saved);
      });
      return;
    }
    setDetails(next);
    onSave(updateWasteWaterDetails(state, itemId, next));
  }

  function handleElectricPanelDetailsChange(next: ElectricPanelDetails) {
    setDetails(next);
    onSave(updateElectricPanelDetails(state, itemId, next));
  }

  function handleWaterHeaterDetailsChange(next: WaterHeaterDetails) {
    setDetails(next);
    onSave(updateWaterHeaterDetails(state, itemId, next));
  }

  function handleWaterTreatmentDetailsChange(next: WaterTreatmentDetails) {
    setDetails(next);
    onSave(updateWaterTreatmentDetails(state, itemId, next));
  }

  function handleAirConditionerDetailsChange(next: AirConditionerDetails) {
    setDetails(next);
    onSave(updateAirConditionerDetails(state, itemId, next));
  }

  function handleAutomobileDetailsChange(next: AutomobileDetails) {
    setDetails(next);
    onSave(updateAutomobileDetails(state, itemId, next));
  }

  function handleSecuritySystemDetailsChange(next: SecuritySystemDetails) {
    setDetails(next);
    onSave(updateSecuritySystemDetails(state, itemId, next));
  }

  function handleRadonMitigationDetailsChange(next: RadonMitigationDetails) {
    setDetails(next);
    onSave(updateRadonMitigationDetails(state, itemId, next));
  }

  function handleWellPumpDetailsChange(next: WellPumpDetails) {
    setDetails(next);
    onSave(updateWellPumpDetails(state, itemId, next));
  }

  function handleGeneratorDetailsChange(next: GeneratorDetails) {
    setDetails(next);
    onSave(updateGeneratorDetails(state, itemId, next));
  }

  function handleSumpPumpDetailsChange(next: SumpPumpDetails) {
    setDetails(next);
    onSave(updateSumpPumpDetails(state, itemId, next));
  }

  function handleGarageDoorDetailsChange(next: GarageDoorDetails) {
    setDetails(next);
    onSave(updateGarageDoorDetails(state, itemId, next));
  }

  function handleRoofDetailsChange(next: RoofDetails) {
    setDetails(next);
    onSave(updateRoofDetails(state, itemId, next));
  }

  function handlePoolDetailsChange(next: PoolDetails) {
    setDetails(next);
    onSave(updatePoolDetails(state, itemId, next));
  }

  function handleIrrigationDetailsChange(next: IrrigationDetails) {
    setDetails(next);
    onSave(updateIrrigationDetails(state, itemId, next));
  }

  function handleEvChargerDetailsChange(next: EvChargerDetails) {
    setDetails(next);
    onSave(updateEvChargerDetails(state, itemId, next));
  }

  function handleSolarDetailsChange(next: SolarDetails) {
    setDetails(next);
    onSave(updateSolarDetails(state, itemId, next));
  }

  function handleHotTubDetailsChange(next: HotTubDetails) {
    setDetails(next);
    onSave(updateHotTubDetails(state, itemId, next));
  }

  function handleToiletDetailsChange(next: ToiletDetails) {
    setDetails(next);
    onSave(updateToiletDetails(state, itemId, next));
  }

  async function addPhoto(sourceUri: string) {
    await addPhotos([sourceUri]);
  }

  async function addPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    const newPhotos: ItemPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return withReusePhotoMeta(sourceUri, {
          id: photoId,
          itemId,
          localUri,
          createdAtISO: nowISO(),
        });
      })
    );
    const newPhotoIds = newPhotos.map((p) => p.id);
    const updatedItem: InventoryItem = {
      ...inv,
      photoIds: [...inv.photoIds, ...newPhotoIds],
    };
    onSave({
      ...state,
      photos: [...state.photos, ...newPhotos],
      items: state.items.map((i) => (i.id === itemId ? updatedItem : i)),
    });
    return newPhotoIds;
  }

  async function removePhoto(photoId: string) {
    const photo = state.photos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    const updatedItem: InventoryItem = {
      ...inv,
      photoIds: inv.photoIds.filter((id) => id !== photoId),
    };
    onSave({
      ...state,
      photos: state.photos.filter((p) => p.id !== photoId),
      items: state.items.map((i) => (i.id === itemId ? updatedItem : i)),
    });
  }

  function reorderPhoto(photoId: string, direction: 'left' | 'right') {
    onSave(
      withReorderedItemPhotoIds(
        state,
        itemId,
        photoId,
        direction,
        photos.map((photo) => photo.id)
      )
    );
  }

  function handlePhotoCaptionChange(photoId: string, caption: string, notes: string) {
    onSave({
      ...state,
      photos: state.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              caption: caption.trim() || undefined,
              notes: notes.trim() || undefined,
            }
          : p
      ),
    });
  }

  function handlePhotoFavoriteChange(photoId: string, favorite: boolean) {
    onSave(setItemPhotoFavorite(state, photoId, favorite));
  }

  const extraDocumentRows = itemExtraDocumentRows(state, inv, (documentId) => {
    void removeItemExtraDocument(state, itemId, documentId).then(onSave);
  });

  async function handleAddDocuments(
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) {
    onSave(await addItemExtraDocuments(state, itemId, picked));
  }

  function confirmDeleteItem() {
    Alert.alert(
      'Delete asset?',
      `Remove "${itemDisplayLabel(inv)}" and all photos and events?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const p of state.photos.filter((ph) => ph.itemId === itemId)) {
              await deletePhotoFile(p.localUri);
            }
            for (const documentId of inv.documentIds ?? []) {
              const doc = state.documents.find((d) => d.id === documentId);
              if (doc) await deleteDocumentFile(doc.localUri);
            }
            onSave(deleteItemCascade(state, itemId));
            onBack();
          },
        },
      ]
    );
  }

  const serviceSections = (
    <View>
      <View style={sharedStyles.sectionFrame}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0, flex: 1 }]}>
            Reminders
          </Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Show upcoming through',
                undefined,
                [
                  ...UPCOMING_HORIZON_OPTIONS.map((opt) => ({
                    text: opt.label,
                    onPress: () => {
                      setUpcomingHorizon(opt.id);
                      void setPropertyUpcomingHorizon(opt.id);
                    },
                  })),
                  { text: 'Done', style: 'cancel' as const },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={`Upcoming range: ${upcomingHorizonLabel(upcomingHorizon)}`}
            accessibilityHint="Opens a list of time ranges for upcoming reminders."
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: 4,
              paddingLeft: 8,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              {upcomingHorizonLabel(upcomingHorizon)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={22} color={colors.primary} />
          </Pressable>
        </View>
        {upcomingEvents.length === 0 ? (
          <Text style={sharedStyles.cardMeta}>No upcoming reminders.</Text>
        ) : (
          <View>
            {upcomingEvents.map((e) => {
              const eventPhotos = photosForEvent(state, e.id);
              return (
                <UpcomingServiceCard
                  key={e.id}
                  event={e}
                  thumbnailUri={eventPhotos[0]?.localUri}
                  onPressDetails={() => onEditEvent(e.id)}
                  onLogService={() => onLogUpcomingService(e.id)}
                />
              );
            })}
          </View>
        )}
      </View>

      <View style={sharedStyles.propertySectionPanel}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 8,
          }}
        >
          <CollapsibleSectionTitle
            title="Service history"
            expanded={serviceHistoryExpanded}
            count={historyEvents.length}
            onExpand={() => setServiceHistoryExpanded((v) => !v)}
          />
          <Pressable
            onPress={onAddEvent}
            accessibilityRole="button"
            accessibilityLabel="Add service event"
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </Pressable>
          {historyEvents.length > 0 ? (
            <Pressable
              onPress={() => setServiceHistoryExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                serviceHistoryExpanded ? 'Hide service history' : 'Show service history'
              }
              accessibilityState={{ expanded: serviceHistoryExpanded }}
              hitSlop={6}
              style={({ pressed }) => ({
                marginLeft: 'auto',
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={serviceHistoryExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
        {historyEvents.length === 0 ? (
          <Text style={[sharedStyles.cardMeta, { marginTop: 0 }]}>
            No service events yet — tap + to log maintenance, repairs, or inspections.
          </Text>
        ) : serviceHistoryExpanded ? (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.text,
            }}
          >
            {historyEvents.map((e) => {
              const eventPhotos = photosForEvent(state, e.id);
              return (
                <EventListRow
                  key={e.id}
                  title={e.title}
                  eventTypeLabel={EVENT_TYPE_LABELS[e.eventType]}
                  dateLabel={formatDisplayDate(serviceListDateISO(e))}
                  costLabel={e.cost != null ? formatCurrency(e.cost) : undefined}
                  notes={e.notes}
                  thumbnailUri={eventPhotos[0]?.localUri}
                  onPress={() => onEditEvent(e.id)}
                />
              );
            })}
          </View>
        ) : null}
      </View>

    </View>
  );

  return (
    <ItemDetailScrollContext.Provider value={handleFieldFocus}>
      <KeyboardDoneTextInputContext.Provider value={keyboardDone.contextValue}>
      <ReuseExistingPhotosProvider state={state} propertyId={propertyId}>
      <KeyboardAvoidingView
        style={[sharedStyles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScreenBackHeader onPress={onBack}>
          <View
            style={{
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Pressable
              onPress={onGoToProperty}
              disabled={exporting || !property}
              accessibilityRole="button"
              accessibilityLabel="Go to property"
              accessibilityHint="Opens the property page for this asset."
              hitSlop={8}
              style={({ pressed }) => [
                {
                  width: 42,
                  height: 36,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  opacity: exporting || !property ? 0.6 : 1,
                },
                pressed && !exporting && property && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="home" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={onSharePress}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Share asset"
              accessibilityHint="Creates an image of this asset and opens the share sheet."
              hitSlop={8}
              style={({ pressed }) => [
                {
                  width: 42,
                  height: 36,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  opacity: exporting ? 0.6 : 1,
                },
                pressed && !exporting && { opacity: 0.8 },
              ]}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="ios-share" size={22} color={colors.primary} />
              )}
            </Pressable>
            {propertyId ? (
              <ToolbarNewSearchControls
                title={itemDisplayLabel(inv)}
                newItems={propertyNewItems}
                searchItems={propertySearchItems}
                disabled={exporting}
              />
            ) : null}
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Asset options"
              accessibilityHint="Opens actions like delete asset."
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="settings" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </ScreenBackHeader>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            sharedStyles.content,
            { paddingTop: 0, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 },
          ]}
          keyboardShouldPersistTaps="always"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
        {isAppliance && applianceDetails ? (
          <ApplianceDisplayView
            state={state}
            details={applianceDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleApplianceDetailsChange}
            initialEditingSection={startEditingSection}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isWaterMain && waterMainDetails ? (
          <WaterMainDisplayView
            state={state}
            details={waterMainDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWaterMainDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isFurnace && furnaceDetails ? (
          <FurnaceDisplayView
            state={state}
            details={furnaceDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleFurnaceDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isAirConditioner && airConditionerDetails ? (
          <AirConditionerDisplayView
            state={state}
            details={airConditionerDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleAirConditionerDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isAutomobile && automobileDetails ? (
          <AutomobileDisplayView
            state={state}
            details={automobileDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleAutomobileDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isWasteWater && wasteWaterDetails ? (
          <WasteWaterDisplayView
            state={state}
            details={wasteWaterDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWasteWaterDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isElectricPanel && electricPanelDetails ? (
          <ElectricPanelDisplayView
            state={state}
            details={electricPanelDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleElectricPanelDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isWaterHeater && waterHeaterDetails ? (
          <WaterHeaterDisplayView
            state={state}
            details={waterHeaterDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWaterHeaterDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isWaterTreatment && waterTreatmentDetails ? (
          <WaterTreatmentDisplayView
            state={state}
            details={waterTreatmentDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWaterTreatmentDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isSecuritySystem && securitySystemDetails ? (
          <SecuritySystemDisplayView
            state={state}
            details={securitySystemDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleSecuritySystemDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isRadonMitigation && radonMitigationDetails ? (
          <RadonMitigationDisplayView
            state={state}
            details={radonMitigationDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleRadonMitigationDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isWellPump && wellPumpDetails ? (
          <WellPumpDisplayView
            state={state}
            details={wellPumpDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWellPumpDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isGenerator && generatorDetails ? (
          <GeneratorDisplayView
            state={state}
            details={generatorDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleGeneratorDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isSumpPump && sumpPumpDetails ? (
          <SumpPumpDisplayView
            state={state}
            details={sumpPumpDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleSumpPumpDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isGarageDoor && garageDoorDetails ? (
          <GarageDoorDisplayView
            state={state}
            details={garageDoorDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleGarageDoorDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isRoof && roofDetails ? (
          <RoofDisplayView
            state={state}
            details={roofDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleRoofDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isPool && poolDetails ? (
          <PoolDisplayView
            state={state}
            details={poolDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handlePoolDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isIrrigation && irrigationDetails ? (
          <IrrigationDisplayView
            state={state}
            details={irrigationDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleIrrigationDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isEvCharger && evChargerDetails ? (
          <EvChargerDisplayView
            state={state}
            details={evChargerDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleEvChargerDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isSolar && solarDetails ? (
          <SolarDisplayView
            state={state}
            details={solarDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleSolarDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isHotTub && hotTubDetails ? (
          <HotTubDisplayView
            state={state}
            details={hotTubDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleHotTubDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : isToilet && toiletDetails ? (
          <ToiletDisplayView
            state={state}
            details={toiletDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleToiletDetailsChange}
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        ) : (
          <ItemDisplayView
            itemTypeId={inv.itemTypeId}
            details={details}
            displayName={inv.displayName}
            photos={photos}
            onAddPhoto={addPhoto}
            onAddPhotos={addPhotos}
            onAddDocuments={handleAddDocuments}
            extraDocumentRows={extraDocumentRows}
            onDeletePhoto={removePhoto}
            onReorderPhoto={reorderPhoto}
            onPhotoCaptionChange={handlePhotoCaptionChange}
            onPhotoFavoriteChange={handlePhotoFavoriteChange}
            onDetailsChange={handleDetailsChange}
            onDisplayNameChange={
              inv.itemTypeId === 'other' ? handleDisplayNameChange : undefined
            }
            photoHeader={itemPhotoHeader}
            showReorderArrows={showReorderArrows}
            onToggleReorderArrows={() => setShowReorderArrows((v) => !v)}
          />
        )}

        {itemSwipeEnabled ? (
          <GestureDetector gesture={itemSwipeGestureForServiceHistory}>
            <View>{serviceSections}</View>
          </GestureDetector>
        ) : (
          serviceSections
        )}
        </ScrollView>
        {keyboardDone.accessory}
      </KeyboardAvoidingView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: colors.card,
                  fontSize: 15,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {itemDisplayLabel(inv)}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                runMenuAction(() => setShowReorderArrows((prev) => !prev))
              }
              accessibilityRole="button"
              accessibilityLabel={
                showReorderArrows ? 'Reorder Photo: On' : 'Reorder Photo: Off'
              }
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                {showReorderArrows ? 'Reorder Photo: On' : 'Reorder Photo: Off'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!textScaleControls.canMakeLarger) return;
                textScaleControls.makeLarger();
              }}
              disabled={!textScaleControls.canMakeLarger}
              accessibilityRole="button"
              accessibilityLabel="Text larger"
              accessibilityState={{ disabled: !textScaleControls.canMakeLarger }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: !textScaleControls.canMakeLarger ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Text larger
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!textScaleControls.canMakeSmaller) return;
                textScaleControls.makeSmaller();
              }}
              disabled={!textScaleControls.canMakeSmaller}
              accessibilityRole="button"
              accessibilityLabel="Text smaller"
              accessibilityState={{ disabled: !textScaleControls.canMakeSmaller }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: !textScaleControls.canMakeSmaller ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Text smaller
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(confirmDeleteItem)}
              accessibilityRole="button"
              accessibilityLabel="Delete asset"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.danger }}>
                Delete asset
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={({ pressed }) => [
                sharedStyles.secondaryBtn,
                { marginTop: 8 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {propertyId ? propertyGearCreateModals : null}

      <SharePhotoModeModal
        visible={shareOptionsOpen}
        title="Share asset"
        photoMode={sharePhotoMode}
        onChangePhotoMode={setSharePhotoMode}
        showPhotoMode={itemHasFavoritePhotos}
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runItemExport(sharePhotoMode, shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
      />

      {exportSnapshot ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 3,
            opacity: 0.02,
          }}
          pointerEvents="none"
          collapsable={false}
        >
          <View ref={exportRef} collapsable={false}>
            <ItemExportSheet snapshot={exportSnapshot} />
          </View>
        </View>
      ) : null}

      {exporting ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
      </ReuseExistingPhotosProvider>
      </KeyboardDoneTextInputContext.Provider>
    </ItemDetailScrollContext.Provider>
  );
}
