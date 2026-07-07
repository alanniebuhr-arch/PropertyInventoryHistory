import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, ItemEvent, ItemEventRecurrence, ItemEventType, ItemPhoto, RecurrenceInterval } from '../types';
import { EventPhotoSection } from '../components/EventPhotoSection';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO, dateInputValue, parseDateInputToISO } from '../utils';
import { deleteEventCascade, itemById, photosForEvent } from '../storage';
import {
  advanceRecurrenceAfterEvent,
  computeNextDueFromOccurrence,
  EVENT_TYPE_LABELS,
} from '../eventRecurrence';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';

function eventByIdHelper(state: AppState, eventId: string): ItemEvent | undefined {
  return state.events.find((e) => e.id === eventId);
}

const EVENT_TYPES: ItemEventType[] = [
  'maintenance',
  'inspection',
  'repair',
  'replacement',
  'improvement',
  'fuel_delivery',
  'other',
];
const RECURRENCE_OPTIONS: RecurrenceInterval[] = ['monthly', 'quarterly', 'annual', 'custom'];

function defaultTitleForType(eventType: ItemEventType, itemTypeId?: string): string {
  if (eventType === 'maintenance') {
    if (itemTypeId === 'furnace') return 'Annual heating service';
    if (itemTypeId === 'air_conditioner') return 'Annual AC service';
    if (itemTypeId === 'automobile') return 'Oil change & inspection';
    if (itemTypeId === 'waste_water') return 'Waste water service';
    if (itemTypeId === 'water_treatment') return 'Filter service';
    return 'Annual maintenance';
  }
  if (eventType === 'repair') return 'Repair';
  if (eventType === 'inspection') return 'Inspection';
  if (eventType === 'improvement') return 'Improvement';
  if (eventType === 'fuel_delivery') return 'Fuel delivery';
  return '';
}

export function AddEditEventScreen(props: {
  state: AppState;
  itemId: string;
  eventId?: string;
  onBack: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, itemId, eventId, onBack, onSave } = props;
  const insets = useSafeAreaInsets();
  const item = itemById(state, itemId);
  const existing = eventId ? eventByIdHelper(state, eventId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [eventType, setEventType] = useState<ItemEventType>(existing?.eventType ?? 'maintenance');
  const [dateStr, setDateStr] = useState(
    existing ? dateInputValue(existing.occurredAtISO) : dateInputValue(nowISO())
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [costStr, setCostStr] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [recurring, setRecurring] = useState(Boolean(existing?.recurrence));
  const [interval, setInterval] = useState<RecurrenceInterval>(existing?.recurrence?.interval ?? 'annual');
  const [customMonths, setCustomMonths] = useState(
    String(existing?.recurrence?.intervalMonths ?? 12)
  );
  const [eventPhotos, setEventPhotos] = useState<ItemPhoto[]>(() =>
    existing ? photosForEvent(state, existing.id) : []
  );
  const [titleTouched, setTitleTouched] = useState(Boolean(existing?.title));
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  useEffect(() => {
    if (existing || titleTouched) return;
    const suggested = defaultTitleForType(eventType, item?.itemTypeId);
    if (suggested) setTitle(suggested);
    if (eventType === 'maintenance' && (item?.itemTypeId === 'furnace' || item?.itemTypeId === 'air_conditioner' || item?.itemTypeId === 'automobile' || item?.itemTypeId === 'waste_water' || item?.itemTypeId === 'water_treatment')) {
      setRecurring(true);
      setInterval('annual');
    }
  }, [existing, eventType, item?.itemTypeId, titleTouched]);

  if (!item) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Item not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const it = item;

  async function addReceiptPhoto(sourceUri: string) {
    const existingReceipt = eventPhotos.find((p) => p.caption === 'receipt');
    if (existingReceipt) {
      await deletePhotoFile(existingReceipt.localUri);
    }
    const photoId = uid('photo');
    const localUri = await persistPhotoFromUri(sourceUri, photoId);
    const newPhoto: ItemPhoto = {
      id: photoId,
      itemId,
      eventId: existing?.id,
      localUri,
      caption: 'receipt',
      createdAtISO: nowISO(),
    };
    setEventPhotos((prev) => [...prev.filter((p) => p.caption !== 'receipt'), newPhoto]);
  }

  async function addEventPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    const newPhotos: ItemPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return {
          id: photoId,
          itemId,
          eventId: existing?.id,
          localUri,
          createdAtISO: nowISO(),
        };
      })
    );
    setEventPhotos((prev) => [...prev, ...newPhotos]);
    return newPhotos.map((photo) => photo.id);
  }

  function handleEventPhotoLabel(photoId: string, label: string) {
    const trimmed = label.trim();
    setEventPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId ? { ...photo, caption: trimmed || undefined } : photo
      )
    );
  }

  async function removeEventPhoto(photoId: string) {
    const photo = eventPhotos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function buildRecurrence(occurredAtISO: string): ItemEventRecurrence | undefined {
    if (!recurring) return undefined;
    const recurrence: ItemEventRecurrence = {
      interval,
      intervalMonths: interval === 'custom' ? Math.max(1, parseInt(customMonths, 10) || 12) : undefined,
    };
    return {
      ...recurrence,
      nextDueAtISO: computeNextDueFromOccurrence(occurredAtISO, recurrence),
    };
  }

  function selectEventType(t: ItemEventType) {
    setEventType(t);
    if (!titleTouched) {
      const suggested = defaultTitleForType(t, it.itemTypeId);
      if (suggested) setTitle(suggested);
    }
    if (t === 'maintenance' && !existing) {
      setRecurring(true);
      if (it.itemTypeId === 'furnace' || it.itemTypeId === 'air_conditioner' || it.itemTypeId === 'automobile' || it.itemTypeId === 'waste_water' || it.itemTypeId === 'water_treatment') setInterval('annual');
    }
  }

  function saveEvent() {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Enter a service event title.');
      return;
    }
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert('Invalid date', 'Enter the date as MM/DD/YYYY.');
      return;
    }
    const cost = costStr.trim() ? parseFloat(costStr) : undefined;
    const recurrence = buildRecurrence(occurredAtISO);
    const photoIds = eventPhotos.map((p) => p.id);

    if (existing) {
      const removedPhotoIds = new Set(
        photosForEvent(state, existing.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = eventPhotos.map((p) => ({ ...p, eventId: existing.id }));
      const keptPhotos = state.photos.filter(
        (p) => p.eventId !== existing.id || !removedPhotoIds.has(p.id)
      );
      const newPhotos = updatedPhotos.filter((p) => !state.photos.some((x) => x.id === p.id));

      const updated: ItemEvent = {
        ...existing,
        title: trimmed,
        eventType,
        occurredAtISO,
        notes: notes.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        recurrence: recurring ? recurrence : undefined,
        photoIds,
      };
      if (updated.recurrence && !existing.recurrence?.nextDueAtISO) {
        updated.recurrence = advanceRecurrenceAfterEvent(updated) ?? updated.recurrence;
      }
      onSave({
        ...state,
        photos: [...keptPhotos, ...newPhotos],
        events: state.events.map((e) => (e.id === existing.id ? updated : e)),
      });
    } else {
      const newEventId = uid('event');
      const photoRecords = eventPhotos.map((p) => ({
        ...p,
        eventId: newEventId,
      }));
      const event: ItemEvent = {
        id: newEventId,
        itemId,
        title: trimmed,
        eventType,
        occurredAtISO,
        notes: notes.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        recurrence,
        photoIds,
      };
      onSave({
        ...state,
        photos: [...state.photos, ...photoRecords],
        events: [...state.events, event],
      });
    }
    onBack();
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete event?', 'Photos attached to this event will also be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          for (const p of photosForEvent(state, existing.id)) {
            await deletePhotoFile(p.localUri);
          }
          onSave(deleteEventCascade(state, existing.id));
          onBack();
        },
      },
    ]);
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack} label="← Cancel" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={sharedStyles.title}>{existing ? 'Edit service event' : 'Log service event'}</Text>
        <Text style={sharedStyles.subtitle}>
          Record maintenance, repairs, or inspections. Add receipt and parts photos below.
        </Text>

        <Text style={sharedStyles.fieldLabel}>Title</Text>
        <TextInput
          value={title}
          onChangeText={(v) => {
            setTitleTouched(true);
            setTitle(v);
          }}
          style={sharedStyles.input}
          placeholder="Annual maintenance, Repair leak…"
        />

        <Text style={sharedStyles.fieldLabel}>Type</Text>
        <Pressable
          onPress={() => setTypePickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Event type: ${EVENT_TYPE_LABELS[eventType]}`}
          accessibilityHint="Opens a list of event types."
          style={[
            sharedStyles.input,
            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
          ]}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>{EVENT_TYPE_LABELS[eventType]}</Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.text} />
        </Pressable>

        <Text style={sharedStyles.fieldLabel}>Date (MM/DD/YYYY)</Text>
        <TextInput value={dateStr} onChangeText={setDateStr} style={sharedStyles.input} placeholder="03/15/2026" />

        <Text style={sharedStyles.fieldLabel}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[sharedStyles.input, sharedStyles.inputMultiline]}
          multiline
          placeholder="What was done, who performed the work…"
        />

        <Text style={sharedStyles.fieldLabel}>Cost (optional)</Text>
        <TextInput
          value={costStr}
          onChangeText={setCostStr}
          style={sharedStyles.input}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <EventPhotoSection
          photos={eventPhotos}
          onAddReceipt={addReceiptPhoto}
          onAddPhotos={addEventPhotos}
          onDeletePhoto={removeEventPhoto}
          onLabelPhoto={handleEventPhotoLabel}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <Text style={sharedStyles.fieldLabel}>Schedule next service</Text>
          <Switch value={recurring} onValueChange={setRecurring} />
        </View>

        {recurring ? (
          <>
            <Text style={sharedStyles.fieldLabel}>Repeat</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setInterval(opt)}
                  style={[
                    sharedStyles.secondaryBtn,
                    { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 },
                    interval === opt && { borderColor: '#1f5fbf', backgroundColor: '#e8f0fc' },
                  ]}
                >
                  <Text style={sharedStyles.secondaryBtnText}>
                    {opt === 'custom' ? 'Custom' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {interval === 'custom' ? (
              <>
                <Text style={sharedStyles.fieldLabel}>Every N months</Text>
                <TextInput
                  value={customMonths}
                  onChangeText={setCustomMonths}
                  style={sharedStyles.input}
                  keyboardType="number-pad"
                />
              </>
            ) : null}
          </>
        ) : null}

        <Pressable
          onPress={saveEvent}
          style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
        >
          <Text style={sharedStyles.primaryBtnText}>Save service event</Text>
        </Pressable>

        {existing ? (
          <Pressable onPress={confirmDelete} style={sharedStyles.dangerBtn}>
            <Text style={sharedStyles.dangerBtnText}>Delete event</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={typePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypePickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setTypePickerOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              paddingBottom: insets.bottom + 20,
            }}
            onPress={() => {}}
          >
            <Text style={sharedStyles.sectionTitle}>Event type</Text>
            {EVENT_TYPES.map((t) => {
              const selected = eventType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    selectEventType(t);
                    setTypePickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    sharedStyles.card,
                    pressed && sharedStyles.cardPressed,
                    selected && { borderColor: '#1f5fbf', backgroundColor: '#e8f0fc' },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={sharedStyles.cardTitle}>{EVENT_TYPE_LABELS[t]}</Text>
                    {selected ? (
                      <MaterialIcons name="check" size={20} color="#1f5fbf" />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
