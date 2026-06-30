import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, ApplianceDetails, InventoryItem, ItemDetails, ItemPhoto } from '../types';
import { EventListRow } from '../components/ListRows';
import { PhotoGallery } from '../components/PhotoGallery';
import {
  ApplianceDisplayView,
  type ApplianceEditingSection,
} from '../components/ApplianceDisplayView';
import { sharedStyles } from '../theme';
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
import { ItemDetailsForm } from '../itemDetailForms';
import { isItemOverdue, nextDueLabelForItem } from '../itemMaintenance';
import { EVENT_TYPE_LABELS, recurrenceLabel } from '../eventRecurrence';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { updateApplianceDetails } from '../appliancePhotos';
import { ItemDetailScrollContext } from '../itemDetailScrollContext';

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
  const applianceDetails = details.kind === 'appliance' ? details : null;
  const room = roomById(state, inv.roomId);
  const property = room ? propertyById(state, room.propertyId) : undefined;
  const photos = photosForItem(state, itemId);
  const events = eventsForItem(state, itemId);
  const nextDue = nextDueLabelForItem(state, itemId);
  const overdue = isItemOverdue(state, itemId);

  function saveDetails() {
    const updated: InventoryItem = { ...inv, details: details as ItemDetails };
    onSave({
      ...state,
      items: state.items.map((i) => (i.id === itemId ? updated : i)),
    });
    Alert.alert('Saved', 'Item details updated.');
  }

  function handleApplianceDetailsChange(next: ApplianceDetails) {
    setDetails(next);
    onSave(updateApplianceDetails(state, itemId, next));
  }

  async function addPhoto(sourceUri: string) {
    await addPhotos([sourceUri]);
  }

  async function addPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return;
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
        </View>
        <Text style={sharedStyles.title}>{itemDisplayLabel({ ...inv, details })}</Text>
        <Text style={sharedStyles.subtitle}>
          {[property?.name, room?.name, catalogLabel(inv.itemTypeId)].filter(Boolean).join(' · ')}
        </Text>
        {nextDue ? (
          <Text style={[sharedStyles.cardMeta, overdue && { color: '#c62828', fontWeight: '700' }]}>
            Next service due: {nextDue}
          </Text>
        ) : null}

        {isAppliance && applianceDetails ? (
          <ApplianceDisplayView
            state={state}
            details={applianceDetails}
            itemId={itemId}
            onSave={onSave}
            onDetailsChange={handleApplianceDetailsChange}
            initialEditingSection={startEditingSection}
          />
        ) : (
          <PhotoGallery
            photos={photos}
            onAddPhoto={addPhoto}
            onAddPhotos={addPhotos}
            onDeletePhoto={removePhoto}
            title="Item photos"
            emptyHint="Add photos of this item, labels, or install location."
            addHint="Tap to view full screen. Pinch to zoom. Swipe for previous/next."
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

        {!isAppliance ? (
          <>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 20 }]}>Details</Text>
            <ItemDetailsForm itemTypeId={inv.itemTypeId} details={details} onChange={setDetails} />
            <Pressable
              onPress={saveDetails}
              style={({ pressed }) => [sharedStyles.secondaryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Save details</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable onPress={confirmDeleteItem} style={sharedStyles.dangerBtn}>
          <Text style={sharedStyles.dangerBtnText}>Delete item</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ItemDetailScrollContext.Provider>
  );
}
