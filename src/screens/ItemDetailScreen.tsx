import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, AirConditionerDetails, ApplianceDetails, AutomobileDetails, ElectricPanelDetails, FurnaceDetails, InventoryItem, ItemDetails, ItemPhoto, WasteWaterDetails, WaterMainDetails, WaterTreatmentDetails } from '../types';
import { EventListRow } from '../components/ListRows';
import { UpcomingServiceCard } from '../components/UpcomingServiceCard';
import { ItemDisplayView } from '../components/ItemDisplayView';
import {
  ApplianceDisplayView,
  type ApplianceEditingSection,
} from '../components/ApplianceDisplayView';
import { sharedStyles, colors } from '../theme';
import { formatDate, uid, nowISO } from '../utils';
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
import { deleteDocumentFile } from '../documentStorage';
import { updateApplianceDetails } from '../appliancePhotos';
import { updateWaterMainDetails, applyWaterMainDetailsChange } from '../waterMainPhotos';
import { furnaceUsesFuelShutoff, furnaceUsesFuelTank } from '../furnaceSlots';
import { updateFurnaceDetails, applyFurnaceDetailsChange } from '../furnacePhotos';
import { updateWasteWaterDetails, applyWasteWaterDetailsChange } from '../wasteWaterPhotos';
import { updateElectricPanelDetails } from '../electricPanelPhotos';
import { updateWaterTreatmentDetails } from '../waterTreatmentPhotos';
import { updateAirConditionerDetails } from '../airConditionerPhotos';
import { updateAutomobileDetails } from '../automobilePhotos';
import {
  addItemExtraDocuments,
  itemExtraDocumentRows,
  removeItemExtraDocument,
} from '../itemExtraDocuments';
import { WaterMainDisplayView } from '../components/WaterMainDisplayView';
import { WaterTreatmentDisplayView } from '../components/WaterTreatmentDisplayView';
import { ElectricPanelDisplayView } from '../components/ElectricPanelDisplayView';
import { FurnaceDisplayView } from '../components/FurnaceDisplayView';
import { AirConditionerDisplayView } from '../components/AirConditionerDisplayView';
import { AutomobileDisplayView } from '../components/AutomobileDisplayView';
import { WasteWaterDisplayView } from '../components/WasteWaterDisplayView';
import { ItemExportSheet } from '../components/ItemExportSheet';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { RoomNavigationDots } from '../components/RoomNavigationDots';
import { ItemDetailScrollContext } from '../itemDetailScrollContext';
import { buildItemExportSnapshot, type ItemExportSnapshot } from '../itemExportContent';
import { shareViewAsPng } from '../shareViewImage';

export function ItemDetailScreen(props: {
  state: AppState;
  itemId: string;
  startEditingSection?: ApplianceEditingSection;
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
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

  const runItemExport = useCallback(async () => {
    const snapshot = buildItemExportSnapshot(state, itemId);
    if (!snapshot) {
      Alert.alert('Export failed', 'Could not build asset summary.');
      return;
    }
    setExportSnapshot(snapshot);
    setExporting(true);
  }, [itemId, state]);

  useEffect(() => {
    if (!exportSnapshot || !exporting) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const shared = await shareViewAsPng(exportRef, `Share ${exportSnapshot.title}`);
        if (!cancelled) {
          setExportSnapshot(null);
          setExporting(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exportSnapshot, exporting]);

  const room = item ? roomById(state, item.roomId) : undefined;
  const property = room ? propertyById(state, room.propertyId) : undefined;
  const roomItems = room ? itemsForRoom(state, room.id) : [];
  const itemIndex = roomItems.findIndex((entry) => entry.id === itemId);
  const itemSwipeEnabled = roomItems.length > 1;

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
  const isWaterTreatment = inv.itemTypeId === 'water_treatment';
  const applianceDetails = details.kind === 'appliance' ? details : null;
  const waterMainDetails = details.kind === 'water_main' ? details : null;
  const wasteWaterDetails = details.kind === 'waste_water' ? details : null;
  const furnaceDetails = details.kind === 'furnace' ? details : null;
  const airConditionerDetails = details.kind === 'air_conditioner' ? details : null;
  const automobileDetails = details.kind === 'automobile' ? details : null;
  const electricPanelDetails = details.kind === 'electric_panel' ? details : null;
  const waterTreatmentDetails = details.kind === 'water_treatment' ? details : null;
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

  async function addPhoto(sourceUri: string) {
    await addPhotos([sourceUri]);
  }

  async function addPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    const newPhotos: ItemPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return {
          id: photoId,
          itemId,
          localUri,
          createdAtISO: nowISO(),
        };
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
    onSave({
      ...state,
      photos: state.photos.map((p) =>
        p.id === photoId ? { ...p, favorite: favorite || undefined } : p
      ),
    });
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
            Service schedule
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
                  { text: 'Cancel', style: 'cancel' as const },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={`Upcoming range: ${upcomingHorizonLabel(upcomingHorizon)}`}
            accessibilityHint="Opens a list of time ranges for upcoming service."
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
          <Text style={sharedStyles.cardMeta}>No upcoming service scheduled.</Text>
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

      <View style={sharedStyles.sectionFrame}>
        <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>New event</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable
            onPress={onAddEvent}
            style={({ pressed }) => [
              sharedStyles.primaryBtn,
              {
                marginTop: 0,
                paddingVertical: 10,
                paddingHorizontal: 12,
                maxWidth: 120,
                flexShrink: 0,
              },
              pressed && sharedStyles.primaryBtnPressed,
            ]}
          >
            <Text style={[sharedStyles.primaryBtnText, { fontSize: 14, textAlign: 'center' }]}>
              {'New\nevent'}
            </Text>
          </Pressable>
          <Text style={[sharedStyles.cardMeta, { flex: 1, marginBottom: 0, marginTop: 0 }]}>
            Log or Schedule maintenance, repairs, and inspections. Attach receipt and parts photos on each event.
          </Text>
        </View>
      </View>

      <View style={sharedStyles.sectionFrame}>
        <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>Service history</Text>
        {historyEvents.length === 0 ? (
          <Text style={[sharedStyles.cardMeta, { marginTop: 0 }]}>
            No service events yet — e.g. annual maintenance or a repair.
          </Text>
        ) : (
          <View>
            {historyEvents.map((e) => {
              const eventPhotos = photosForEvent(state, e.id);
              return (
                <EventListRow
                  key={e.id}
                  title={e.title}
                  eventTypeLabel={EVENT_TYPE_LABELS[e.eventType]}
                  dateLabel={formatDate(e.occurredAtISO)}
                  notes={e.notes}
                  thumbnailUri={eventPhotos[0]?.localUri}
                  onPress={() => onEditEvent(e.id)}
                />
              );
            })}
          </View>
        )}
      </View>

    </View>
  );

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  return (
    <ItemDetailScrollContext.Provider value={handleFieldFocus}>
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
              onPress={() => void runItemExport()}
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
          />
        ) : isWaterMain && waterMainDetails ? (
          <WaterMainDisplayView
            state={state}
            details={waterMainDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWaterMainDetailsChange}
            photoHeader={itemPhotoHeader}
          />
        ) : isFurnace && furnaceDetails ? (
          <FurnaceDisplayView
            state={state}
            details={furnaceDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleFurnaceDetailsChange}
            photoHeader={itemPhotoHeader}
          />
        ) : isAirConditioner && airConditionerDetails ? (
          <AirConditionerDisplayView
            state={state}
            details={airConditionerDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleAirConditionerDetailsChange}
            photoHeader={itemPhotoHeader}
          />
        ) : isAutomobile && automobileDetails ? (
          <AutomobileDisplayView
            state={state}
            details={automobileDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleAutomobileDetailsChange}
            photoHeader={itemPhotoHeader}
          />
        ) : isWasteWater && wasteWaterDetails ? (
          <WasteWaterDisplayView
            state={state}
            details={wasteWaterDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWasteWaterDetailsChange}
            photoHeader={itemPhotoHeader}
          />
        ) : isElectricPanel && electricPanelDetails ? (
          <ElectricPanelDisplayView
            state={state}
            details={electricPanelDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleElectricPanelDetailsChange}
            photoHeader={itemPhotoHeader}
          />
        ) : isWaterTreatment && waterTreatmentDetails ? (
          <WaterTreatmentDisplayView
            state={state}
            details={waterTreatmentDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleWaterTreatmentDetailsChange}
            photoHeader={itemPhotoHeader}
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
            onPhotoCaptionChange={handlePhotoCaptionChange}
            onPhotoFavoriteChange={handlePhotoFavoriteChange}
            onDetailsChange={handleDetailsChange}
            onDisplayNameChange={
              inv.itemTypeId === 'other' ? handleDisplayNameChange : undefined
            }
            photoHeader={itemPhotoHeader}
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
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <ItemExportSheet snapshot={exportSnapshot} /> : null}
          </View>
        </View>
      </Modal>

      {exporting ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
    </ItemDetailScrollContext.Provider>
  );
}
