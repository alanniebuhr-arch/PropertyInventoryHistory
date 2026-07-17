import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, ItemEvent, ItemEventRecurrence, ItemEventType, ItemPhoto, RecurrenceInterval } from '../types';
import { EventPhotoSection } from '../components/EventPhotoSection';
import { EventListRow } from '../components/ListRows';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO, dateInputValue, parseDateInputToISO, parseDateInputValue, formatDate } from '../utils';
import { deleteEventCascade, eventsForItem, firstPhotoUriForItem, itemById, photosForEvent } from '../storage';
import { itemDisplayLabel } from '../itemCatalog';
import {
  clearEventNextDue,
  computeNextDueFromOccurrence,
  daysOverdue,
  EVENT_TYPE_LABELS,
  isOverdue,
  sameCalendarDay,
  upcomingDueAtISO,
} from '../eventRecurrence';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';

type HistoryMode = 'related' | 'all';

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

type ScheduleMode = 'repeat' | 'onetime';

function prefillsFromSource(source: ItemEvent | undefined): {
  title: string;
  eventType: ItemEventType;
  recurring: boolean;
  scheduleMode: ScheduleMode;
  interval: Exclude<RecurrenceInterval, 'once'>;
  customMonths: string;
  scheduleNotes: string;
} {
  if (!source) {
    return {
      title: '',
      eventType: 'maintenance',
      recurring: false,
      scheduleMode: 'repeat',
      interval: 'annual',
      customMonths: '12',
      scheduleNotes: '',
    };
  }
  const sourceInterval = source.recurrence?.interval;
  const scheduleNotes = source.recurrence?.notes ?? '';
  if (sourceInterval && sourceInterval !== 'once') {
    return {
      title: source.title,
      eventType: source.eventType,
      recurring: true,
      scheduleMode: 'repeat',
      interval: sourceInterval,
      customMonths: String(source.recurrence?.intervalMonths ?? 12),
      scheduleNotes,
    };
  }
  return {
    title: source.title,
    eventType: source.eventType,
    recurring: false,
    scheduleMode: 'repeat',
    interval: 'annual',
    customMonths: '12',
    scheduleNotes,
  };
}

const REPEAT_OPTIONS: Exclude<RecurrenceInterval, 'once'>[] = [
  'monthly',
  'quarterly',
  'annual',
  'every_2_years',
  'every_3_years',
  'custom',
];

function repeatPeriodLabel(opt: Exclude<RecurrenceInterval, 'once'>): string {
  switch (opt) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'annual':
      return 'Annual';
    case 'every_2_years':
      return '2 Year';
    case 'every_3_years':
      return '3 Year';
    case 'custom':
      return 'Custom';
  }
}

function draftRecurrence(
  interval: Exclude<RecurrenceInterval, 'once'>,
  customMonths: string
): ItemEventRecurrence {
  return {
    interval,
    intervalMonths: interval === 'custom' ? Math.max(1, parseInt(customMonths, 10) || 12) : undefined,
  };
}

function computedNextDueLabel(
  dateStr: string,
  interval: Exclude<RecurrenceInterval, 'once'>,
  customMonths: string
): string {
  const occurredAtISO = parseDateInputToISO(dateStr);
  if (!occurredAtISO) return '—';
  return dateInputValue(
    computeNextDueFromOccurrence(occurredAtISO, draftRecurrence(interval, customMonths))
  );
}

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
  /** When set, creating a new event that completes this reminder. */
  completeFromEventId?: string;
  onBack: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, itemId, eventId, completeFromEventId, onBack, onSave } = props;
  const insets = useSafeAreaInsets();
  const item = itemById(state, itemId);
  const existing = eventId ? eventByIdHelper(state, eventId) : undefined;
  const completeFrom =
    !existing && completeFromEventId
      ? eventByIdHelper(state, completeFromEventId)
      : undefined;
  const fromReminder = prefillsFromSource(completeFrom);
  const activeReminder = existing?.recurrence?.nextDueAtISO
    ? existing
    : completeFrom?.recurrence?.nextDueAtISO
      ? completeFrom
      : undefined;
  const showServiceCompletedToggle = Boolean(activeReminder);
  /** Completed history entry — edit details only, no new scheduling. */
  const isPastHistoryEdit = Boolean(existing && !existing.recurrence?.nextDueAtISO);
  const showScheduleControls = !isPastHistoryEdit;
  const activeDueAt = activeReminder ? upcomingDueAtISO(activeReminder) : undefined;
  const activeDueOverdue = isOverdue(activeDueAt);
  const activeDaysLate = daysOverdue(activeDueAt);

  const [title, setTitle] = useState(existing?.title ?? fromReminder.title);
  const [eventType, setEventType] = useState<ItemEventType>(
    existing?.eventType ?? fromReminder.eventType
  );
  const [serviceCompleted, setServiceCompleted] = useState(() => {
    if (completeFrom) return true;
    if (existing?.recurrence?.nextDueAtISO) {
      return isOverdue(upcomingDueAtISO(existing));
    }
    return false;
  });
  const [dateStr, setDateStr] = useState(() => {
    if (completeFrom) return dateInputValue(nowISO());
    if (existing?.recurrence?.nextDueAtISO && isOverdue(upcomingDueAtISO(existing))) {
      return dateInputValue(nowISO());
    }
    if (existing) return dateInputValue(existing.occurredAtISO);
    return dateInputValue(nowISO());
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [costStr, setCostStr] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [recurring, setRecurring] = useState(() => {
    if (existing && !existing.recurrence?.nextDueAtISO) return false;
    return existing ? Boolean(existing.recurrence) : fromReminder.recurring;
  });
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(() => {
    if (existing?.recurrence?.interval === 'once') return 'onetime';
    if (existing) return 'repeat';
    return fromReminder.scheduleMode;
  });
  const [interval, setInterval] = useState<Exclude<RecurrenceInterval, 'once'>>(() => {
    const existingInterval = existing?.recurrence?.interval;
    if (existingInterval && existingInterval !== 'once') return existingInterval;
    return fromReminder.interval;
  });
  const [customMonths, setCustomMonths] = useState(() => {
    if (existing?.recurrence?.intervalMonths != null) {
      return String(existing.recurrence.intervalMonths);
    }
    return fromReminder.customMonths;
  });
  const [nextDueStr, setNextDueStr] = useState(() => {
    if (existing?.recurrence?.interval === 'once' && existing.recurrence.nextDueAtISO) {
      return dateInputValue(existing.recurrence.nextDueAtISO);
    }
    return '';
  });
  const [scheduleNotes, setScheduleNotes] = useState(
    existing?.recurrence?.notes ?? fromReminder.scheduleNotes
  );
  const [eventPhotos, setEventPhotos] = useState<ItemPhoto[]>(() =>
    existing ? photosForEvent(state, existing.id) : []
  );
  const [titleTouched, setTitleTouched] = useState(
    Boolean(existing?.title) || Boolean(completeFrom?.title)
  );
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<HistoryMode>('related');
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const nextDueInputRef = useRef<TextInput>(null);
  const customMonthsInputRef = useRef<TextInput>(null);
  const scheduleNotesInputRef = useRef<TextInput>(null);
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

  const measureAndScroll = useCallback(
    (input: TextInput | null) => {
      // Defer so layout reflects the focused field before measuring.
      requestAnimationFrame(() => {
        input?.measureInWindow((_x, y, _w, height) => {
          handleFieldFocus(y, height);
        });
      });
    },
    [handleFieldFocus]
  );

  useEffect(() => {
    if (existing || titleTouched || completeFrom) return;
    const suggested = defaultTitleForType(eventType, item?.itemTypeId);
    if (suggested) setTitle(suggested);
    if (eventType === 'maintenance' && (item?.itemTypeId === 'furnace' || item?.itemTypeId === 'air_conditioner' || item?.itemTypeId === 'automobile' || item?.itemTypeId === 'waste_water' || item?.itemTypeId === 'water_treatment')) {
      setRecurring(true);
      setScheduleMode('repeat');
      setInterval('annual');
    }
  }, [completeFrom, existing, eventType, item?.itemTypeId, titleTouched]);

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

  const allPastEvents = useMemo(
    () => eventsForItem(state, itemId).filter((e) => e.id !== existing?.id),
    [state, itemId, existing?.id]
  );
  const relatedPastEvents = useMemo(() => {
    const key = title.trim().toLowerCase();
    if (!key) return [];
    return allPastEvents.filter((e) => e.title.trim().toLowerCase() === key);
  }, [allPastEvents, title]);
  const historyEvents = historyMode === 'all' ? allPastEvents : relatedPastEvents;
  const titleKey = title.trim().toLowerCase();

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
  const itemThumbUri = firstPhotoUriForItem(state, it);
  const itemLabel = itemDisplayLabel(it);

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

  function buildRecurrence(): ItemEventRecurrence | undefined {
    if (!recurring) return undefined;
    const notes = scheduleNotes.trim() || undefined;

    if (scheduleMode === 'onetime') {
      const nextDueAtISO = parseDateInputToISO(nextDueStr);
      if (!nextDueAtISO) return undefined;
      return { interval: 'once', nextDueAtISO, notes };
    }

    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) return undefined;
    const draft = draftRecurrence(interval, customMonths);
    return {
      ...draft,
      nextDueAtISO: computeNextDueFromOccurrence(occurredAtISO, draft),
      notes,
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
      setScheduleMode('repeat');
      if (
        it.itemTypeId === 'furnace' ||
        it.itemTypeId === 'air_conditioner' ||
        it.itemTypeId === 'automobile' ||
        it.itemTypeId === 'waste_water' ||
        it.itemTypeId === 'water_treatment'
      ) {
        setInterval('annual');
      }
    }
  }

  function handleServiceCompletedChange(on: boolean) {
    setServiceCompleted(on);
    const prior = existing ?? completeFrom;
    if (on) {
      const currentISO = parseDateInputToISO(dateStr);
      if (prior && (!currentISO || sameCalendarDay(currentISO, prior.occurredAtISO))) {
        setDateStr(dateInputValue(nowISO()));
      }
    } else if (prior) {
      setDateStr(dateInputValue(prior.occurredAtISO));
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

    if (recurring && scheduleMode === 'onetime') {
      const nextDueAtISO = parseDateInputToISO(nextDueStr);
      if (!nextDueAtISO) {
        Alert.alert('Invalid next due date', 'Enter the next due date as MM/DD/YYYY.');
        return;
      }
      const occurredYmd = parseDateInputValue(dateStr);
      const nextDueYmd = parseDateInputValue(nextDueStr);
      if (occurredYmd && nextDueYmd && nextDueYmd < occurredYmd) {
        Alert.alert('Invalid next due date', 'Next due date must be on or after the service date.');
        return;
      }
    }

    const cost = costStr.trim() ? parseFloat(costStr) : undefined;
    const recurrence = isPastHistoryEdit
      ? existing?.recurrence
      : buildRecurrence();
    if (!isPastHistoryEdit && recurring && !recurrence) {
      Alert.alert('Schedule incomplete', 'Choose a repeat period or enter a one-time next due date.');
      return;
    }
    const photoIds = eventPhotos.map((p) => p.id);
    const completing =
      showServiceCompletedToggle && serviceCompleted
        ? (existing ?? completeFrom)
        : undefined;

    if (completing) {
      // Preserve the previous occurrence as history; save form data as a new event.
      const frozen = clearEventNextDue(completing);
      const originalPhotoIds = new Set(completing.photoIds);
      const newEventId = uid('event');
      const carriedPhotos = existing
        ? eventPhotos.filter((p) => !originalPhotoIds.has(p.id))
        : eventPhotos;
      const carriedPhotoIds = carriedPhotos.map((p) => p.id);
      const newEvent: ItemEvent = {
        id: newEventId,
        itemId,
        title: trimmed,
        eventType,
        occurredAtISO,
        notes: notes.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        recurrence: isPastHistoryEdit
          ? existing?.recurrence
          : recurring
            ? recurrence
            : undefined,
        photoIds: carriedPhotoIds,
      };
      onSave({
        ...state,
        photos: [
          ...state.photos.filter((p) => !carriedPhotoIds.includes(p.id)),
          ...carriedPhotos.map((p) => ({ ...p, eventId: newEventId })),
        ],
        events: [
          ...state.events.map((e) => (e.id === completing.id ? frozen : e)),
          newEvent,
        ],
      });
      onBack();
      return;
    }

    if (existing || (completeFrom && showServiceCompletedToggle && !serviceCompleted)) {
      const target = existing ?? completeFrom!;
      const removedPhotoIds = new Set(
        photosForEvent(state, target.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = eventPhotos.map((p) => ({ ...p, eventId: target.id }));
      const keptPhotos = state.photos.filter(
        (p) => p.eventId !== target.id || !removedPhotoIds.has(p.id)
      );
      const newPhotos = updatedPhotos.filter((p) => !state.photos.some((x) => x.id === p.id));

      const updated: ItemEvent = {
        ...target,
        title: trimmed,
        eventType,
        occurredAtISO,
        notes: notes.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        recurrence: isPastHistoryEdit
          ? target.recurrence
          : recurring
            ? recurrence
            : undefined,
        photoIds,
      };
      onSave({
        ...state,
        photos: [...keptPhotos, ...newPhotos],
        events: state.events.map((e) => (e.id === target.id ? updated : e)),
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
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader onPress={onBack} label="← Cancel">
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {existing ? (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete event"
              hitSlop={8}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>Delete</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={saveEvent}
            accessibilityRole="button"
            accessibilityLabel="Save service event"
            hitSlop={8}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save</Text>
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
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          {itemThumbUri ? (
            <Image
              source={{ uri: itemThumbUri }}
              accessibilityLabel={`${itemLabel} photo`}
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                backgroundColor: colors.border,
              }}
            />
          ) : null}
          <Text style={[sharedStyles.title, { marginBottom: 0 }]} numberOfLines={2}>
            {itemLabel}
          </Text>
        </View>
        <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>
          {showServiceCompletedToggle
            ? serviceCompleted
              ? 'Log scheduled service'
              : 'Edit service event'
            : existing
              ? 'Edit service event'
              : 'Log service event'}
        </Text>
        {activeDueOverdue && activeDueAt ? (
          <View
            style={{
              backgroundColor: colors.upcomingOverdueBg,
              borderWidth: 1,
              borderColor: colors.overdue,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.overdue, fontWeight: '800', fontSize: 15 }}>
              Missed service — due {formatDate(activeDueAt)}
              {activeDaysLate > 0
                ? ` · ${activeDaysLate} day${activeDaysLate === 1 ? '' : 's'} late`
                : ''}
            </Text>
          </View>
        ) : null}
        {showServiceCompletedToggle ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text style={[sharedStyles.fieldLabel, { marginBottom: 0 }]}>Service completed</Text>
              <Switch value={serviceCompleted} onValueChange={handleServiceCompletedChange} />
            </View>
            <Text style={[sharedStyles.subtitle, { marginBottom: 12 }]}>
              {serviceCompleted
                ? recurring
                  ? 'Record this service and schedule the next.'
                  : 'Record this service.'
                : 'Update this reminder.'}
            </Text>
          </>
        ) : (
          <Text style={sharedStyles.subtitle}>
            Record maintenance, repairs, or inspections. Add receipt and parts photos below.
          </Text>
        )}

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

        <View style={{ marginTop: 4, marginBottom: 12 }}>
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
              {historyMode === 'related' ? 'Related history' : 'Service history'}
            </Text>
            {allPastEvents.length > 0 ? (
              <Pressable
                onPress={() =>
                  setHistoryMode((mode) => (mode === 'related' ? 'all' : 'related'))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  historyMode === 'related' ? 'Show all history' : 'Show related only'
                }
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, paddingVertical: 4 })}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                  {historyMode === 'related' ? 'Show all history' : 'Show related only'}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {allPastEvents.length === 0 ? (
            <Text style={sharedStyles.cardMeta}>
              No other service events for this item yet. Past logs will show here.
            </Text>
          ) : historyEvents.length === 0 ? (
            <Text style={sharedStyles.cardMeta}>
              {historyMode === 'related'
                ? titleKey
                  ? 'No past events with this title. Tap Show all history to see other services.'
                  : 'Enter a title to find related past services, or tap Show all history.'
                : 'No other service events yet.'}
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
                  />
                );
              })}
            </View>
          )}
        </View>

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
        <TextInput
          value={dateStr}
          onChangeText={setDateStr}
          style={sharedStyles.input}
          placeholder="03/15/2026"
        />

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

        {showScheduleControls ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <Text style={sharedStyles.fieldLabel}>Schedule next service</Text>
              <Switch value={recurring} onValueChange={setRecurring} />
            </View>

            {recurring ? (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {([
                    { id: 'repeat' as const, label: 'Repeat' },
                    { id: 'onetime' as const, label: 'Onetime' },
                  ]).map((mode) => (
                    <Pressable
                      key={mode.id}
                      onPress={() => setScheduleMode(mode.id)}
                      style={[
                        sharedStyles.secondaryBtn,
                        { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 },
                        scheduleMode === mode.id && { borderColor: '#1f5fbf', backgroundColor: '#e8f0fc' },
                      ]}
                    >
                      <Text style={sharedStyles.secondaryBtnText}>{mode.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {scheduleMode === 'repeat' ? (
                  <>
                    <Text style={sharedStyles.fieldLabel}>Repeat</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {REPEAT_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => setInterval(opt)}
                          style={[
                            sharedStyles.secondaryBtn,
                            { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 },
                            interval === opt && { borderColor: '#1f5fbf', backgroundColor: '#e8f0fc' },
                          ]}
                        >
                          <Text style={sharedStyles.secondaryBtnText}>{repeatPeriodLabel(opt)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {interval === 'custom' ? (
                      <>
                        <Text style={sharedStyles.fieldLabel}>Every N months</Text>
                        <TextInput
                          ref={customMonthsInputRef}
                          value={customMonths}
                          onChangeText={setCustomMonths}
                          onFocus={() => measureAndScroll(customMonthsInputRef.current)}
                          style={sharedStyles.input}
                          keyboardType="number-pad"
                        />
                      </>
                    ) : null}
                    <Text style={[sharedStyles.cardMeta, { marginTop: 12 }]}>
                      Next service: {computedNextDueLabel(dateStr, interval, customMonths)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={sharedStyles.fieldLabel}>Next due date (MM/DD/YYYY)</Text>
                    <TextInput
                      ref={nextDueInputRef}
                      value={nextDueStr}
                      onChangeText={setNextDueStr}
                      onFocus={() => measureAndScroll(nextDueInputRef.current)}
                      style={sharedStyles.input}
                      placeholder="06/15/2027"
                    />
                  </>
                )}

                <Text style={sharedStyles.fieldLabel}>Notes</Text>
                <TextInput
                  ref={scheduleNotesInputRef}
                  value={scheduleNotes}
                  onChangeText={setScheduleNotes}
                  onFocus={() => measureAndScroll(scheduleNotesInputRef.current)}
                  style={[sharedStyles.input, sharedStyles.inputMultiline]}
                  multiline
                  placeholder="Reminders for the next service…"
                />
              </>
            ) : null}
          </>
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
    </KeyboardAvoidingView>
  );
}
