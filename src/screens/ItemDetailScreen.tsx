import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, ApplianceDetails, ElectricPanelDetails, FurnaceDetails, InventoryItem, ItemDetails, ItemPhoto, WasteWaterDetails, WaterMainDetails, WaterTreatmentDetails } from '../types';
import { EventListRow } from '../components/ListRows';
import { ItemDisplayView } from '../components/ItemDisplayView';
import {
  ApplianceDisplayView,
  type ApplianceEditingSection,
} from '../components/ApplianceDisplayView';
import { sharedStyles, colors } from '../theme';
import { formatCurrency, formatDate, uid, nowISO } from '../utils';
import {
  deleteItemCascade,
  eventsForItem,
  itemById,
  photosForEvent,
  photosForItem,
  propertyById,
  roomById,
} from '../storage';
import { catalogLabel, itemDisplayLabel } from '../itemCatalog';
import { isItemOverdue, nextDueLabelForItem } from '../itemMaintenance';
import { EVENT_TYPE_LABELS, recurrenceLabel } from '../eventRecurrence';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { updateApplianceDetails } from '../appliancePhotos';
import { updateWaterMainDetails, applyWaterMainDetailsChange } from '../waterMainPhotos';
import { furnaceUsesFuelShutoff, furnaceUsesFuelTank } from '../furnaceSlots';
import { updateFurnaceDetails, applyFurnaceDetailsChange } from '../furnacePhotos';
import { updateWasteWaterDetails, applyWasteWaterDetailsChange } from '../wasteWaterPhotos';
import { updateElectricPanelDetails } from '../electricPanelPhotos';
import { updateWaterTreatmentDetails } from '../waterTreatmentPhotos';
import { WaterMainDisplayView } from '../components/WaterMainDisplayView';
import { WaterTreatmentDisplayView } from '../components/WaterTreatmentDisplayView';
import { ElectricPanelDisplayView } from '../components/ElectricPanelDisplayView';
import { FurnaceDisplayView } from '../components/FurnaceDisplayView';
import { WasteWaterDisplayView } from '../components/WasteWaterDisplayView';
import { ItemExportSheet } from '../components/ItemExportSheet';
import { ItemDetailScrollContext } from '../itemDetailScrollContext';
import { buildItemExportSnapshot, type ItemExportSnapshot } from '../itemExportContent';
import { shareViewAsPng } from '../shareViewImage';

export function ItemDetailScreen(props: {
  state: AppState;
  itemId: string;
  startEditingSection?: ApplianceEditingSection;
  onBack: () => void;
  onAddEvent: () => void;
  onEditEvent: (eventId: string) => void;
  onSave: (state: AppState) => void;
}) {
  const { state, itemId, startEditingSection, onBack, onAddEvent, onEditEvent, onSave } = props;
  const insets = useSafeAreaInsets();
  const item = itemById(state, itemId);
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [exportSnapshot, setExportSnapshot] = useState<ItemExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<View>(null);

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
      Alert.alert('Export failed', 'Could not build item summary.');
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

  if (!item || !details) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Item not found.</Text>
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
  const isElectricPanel = inv.itemTypeId === 'electric_panel';
  const isWaterTreatment = inv.itemTypeId === 'water_treatment';
  const applianceDetails = details.kind === 'appliance' ? details : null;
  const waterMainDetails = details.kind === 'water_main' ? details : null;
  const wasteWaterDetails = details.kind === 'waste_water' ? details : null;
  const furnaceDetails = details.kind === 'furnace' ? details : null;
  const electricPanelDetails = details.kind === 'electric_panel' ? details : null;
  const waterTreatmentDetails = details.kind === 'water_treatment' ? details : null;
  const room = roomById(state, inv.roomId);
  const property = room ? propertyById(state, room.propertyId) : undefined;
  const photos = photosForItem(state, itemId);
  const events = eventsForItem(state, itemId);
  const nextDue = nextDueLabelForItem(state, itemId);
  const overdue = isItemOverdue(state, itemId);

  const itemPhotoHeader = (
    <>
      <Text style={sharedStyles.title}>{itemDisplayLabel({ ...inv, details })}</Text>
      <Text style={sharedStyles.subtitle}>
        {[property?.name, room?.name, catalogLabel(inv.itemTypeId)].filter(Boolean).join(' · ')}
      </Text>
      {nextDue ? (
        <Text style={[sharedStyles.cardMeta, overdue && { color: '#c62828', fontWeight: '700' }]}>
          Next service due: {nextDue}
        </Text>
      ) : null}
    </>
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

  function handlePhotoCaptionChange(photoId: string, caption: string) {
    onSave({
      ...state,
      photos: state.photos.map((p) =>
        p.id === photoId ? { ...p, caption: caption.trim() || undefined } : p
      ),
    });
  }

  function confirmDeleteItem() {
    Alert.alert(
      'Delete item?',
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
            onSave(deleteItemCascade(state, itemId));
            onBack();
          },
        },
      ]
    );
  }

  return (
    <ItemDetailScrollContext.Provider value={handleFieldFocus}>
      <KeyboardAvoidingView
        style={[sharedStyles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            sharedStyles.content,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 },
          ]}
          keyboardShouldPersistTaps="always"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
        <View style={sharedStyles.headerRow}>
          <Pressable onPress={onBack} style={sharedStyles.backBtn}>
            <Text style={sharedStyles.backBtnText}>← Back</Text>
          </Pressable>
          <Pressable
            onPress={() => void runItemExport()}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Share item"
            accessibilityHint="Creates an image of this item and opens the share sheet."
            hitSlop={8}
            style={({ pressed }) => [
              {
                marginLeft: 'auto',
                width: 42,
                height: 36,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
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
        </View>

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
            onDeletePhoto={removePhoto}
            onPhotoCaptionChange={handlePhotoCaptionChange}
            onDetailsChange={handleDetailsChange}
            onDisplayNameChange={
              inv.itemTypeId === 'other' ? handleDisplayNameChange : undefined
            }
            photoHeader={itemPhotoHeader}
          />
        )}

        <Text style={sharedStyles.sectionTitle}>Service history</Text>
        <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>
          Log maintenance, repairs, and inspections. Attach receipt and parts photos on each event.
        </Text>
        <Pressable
          onPress={onAddEvent}
          style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
        >
          <Text style={sharedStyles.primaryBtnText}>Log service event</Text>
        </Pressable>
        {events.length === 0 ? (
          <Text style={[sharedStyles.cardMeta, { marginTop: 12 }]}>
            No service events yet — e.g. annual maintenance or a repair.
          </Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {events.map((e) => (
              <EventListRow
                key={e.id}
                title={e.title}
                eventTypeLabel={EVENT_TYPE_LABELS[e.eventType]}
                dateLabel={formatDate(e.occurredAtISO)}
                costLabel={e.cost != null ? formatCurrency(e.cost) : undefined}
                recurrenceLabel={e.recurrence ? recurrenceLabel(e.recurrence) : undefined}
                photoCount={photosForEvent(state, e.id).length}
                onPress={() => onEditEvent(e.id)}
              />
            ))}
          </View>
        )}

        <Pressable onPress={confirmDeleteItem} style={sharedStyles.dangerBtn}>
          <Text style={sharedStyles.dangerBtnText}>Delete item</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

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
