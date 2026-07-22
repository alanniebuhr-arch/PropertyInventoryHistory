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
import type { AppState, ItemEvent, ItemEventRecurrence, ItemEventType, ItemPhoto } from '../types';
import { EventPhotoSection } from '../components/EventPhotoSection';
import { EventListRow } from '../components/ListRows';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO, dateInputValue, parseDateInputToISO, parseDateInputValue, formatDate } from '../utils';
import { deleteEventCascade, firstPhotoUriForItem, itemById, photosForEvent, serviceHistoryEventsForItem } from '../storage';
import { itemDisplayLabel } from '../itemCatalog';
import {
  addMonths,
  clearEventNextDue,
  daysOverdue,
  ensureFutureDatedEventScheduled,
  EVENT_TYPE_LABELS,
  isAfterToday,
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

function prefillsFromSource(source: ItemEvent | undefined): {
  title: string;
  eventType: ItemEventType;
  scheduleNotes: string;
} {
  if (!source) {
    return {
      title: '',
      eventType: 'maintenance',
      scheduleNotes: '',
    };
  }
  return {
    title: source.title,
    eventType: source.eventType,
    scheduleNotes: source.recurrence?.notes ?? '',
  };
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
  /** Event that Delete removes — the open record, or the schedule reminder being logged from. */
  const deletableEvent = existing ?? completeFrom;
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
    // Logging a completion (from schedule or overdue reminder): default to today.
    if (completeFrom) return dateInputValue(nowISO());
    if (existing?.recurrence?.nextDueAtISO) {
      const dueAt = upcomingDueAtISO(existing);
      if (isOverdue(dueAt)) return dateInputValue(nowISO());
      // Editing a future reminder: show the scheduled due date from the list.
      if (dueAt) return dateInputValue(dueAt);
    }
    if (existing) return dateInputValue(existing.occurredAtISO);
    return dateInputValue(nowISO());
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [serviceCompany, setServiceCompany] = useState(existing?.serviceCompany ?? '');
  const [costStr, setCostStr] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [recurring, setRecurring] = useState(() => {
    // Create always starts with Schedule next service off.
    if (!existing) return false;
    return Boolean(existing.recurrence?.nextDueAtISO || existing.recurrence);
  });
  const [nextDueStr, setNextDueStr] = useState(() => {
    if (existing?.recurrence?.nextDueAtISO) {
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
  const scheduleNotesInputRef = useRef<TextInput>(null);
  const dirtyRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
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
    // Editing an open reminder whose last service was already past: date field is next due.
    if (showServiceCompletedToggle && !serviceCompleted) {
      if (existing && isAfterToday(existing.occurredAtISO) && recurring) {
        setRecurring(false);
        setNextDueStr('');
      }
      return;
    }
    const dateISO = parseDateInputToISO(dateStr);
    if (dateISO && isAfterToday(dateISO) && recurring) {
      setRecurring(false);
      setNextDueStr('');
    }
  }, [dateStr, recurring, serviceCompleted, showServiceCompletedToggle, existing]);

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
    () => serviceHistoryEventsForItem(state, itemId).filter((e) => e.id !== existing?.id),
    [state, itemId, existing?.id]
  );
  const relatedPastEvents = useMemo(() => {
    const key = title.trim().toLowerCase();
    if (!key) return [];
    return allPastEvents.filter((e) => e.title.trim().toLowerCase() === key);
  }, [allPastEvents, title]);
  const historyEvents = historyMode === 'all' ? allPastEvents : relatedPastEvents;
  const titleKey = title.trim().toLowerCase();
  const parsedEventDate = parseDateInputToISO(dateStr);
  const eventDateIsFuture = Boolean(parsedEventDate && isAfterToday(parsedEventDate));
  const editingOpenReminder = showServiceCompletedToggle && !serviceCompleted;
  const occurrenceIsFuture = Boolean(existing && isAfterToday(existing.occurredAtISO));
  /** Future-dated events (or future service date on create/complete) cannot schedule a follow-up. */
  const showScheduleNextControls =
    showScheduleControls &&
    !occurrenceIsFuture &&
    (editingOpenReminder || !eventDateIsFuture);

  if (!item) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Asset not found.</Text>
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
    markDirty();
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
    markDirty();
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

  function handleEventPhotoLabel(photoId: string, label: string, notes: string) {
    markDirty();
    const trimmed = label.trim();
    const trimmedNotes = notes.trim();
    setEventPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              caption: trimmed || undefined,
              notes: trimmedNotes || undefined,
            }
          : photo
      )
    );
  }

  function handleEventPhotoFavorite(photoId: string, favorite: boolean) {
    markDirty();
    setEventPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId ? { ...photo, favorite: favorite || undefined } : photo
      )
    );
  }

  async function removeEventPhoto(photoId: string) {
    markDirty();
    const photo = eventPhotos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function buildRecurrence(): ItemEventRecurrence | undefined {
    if (!recurring) return undefined;
    const notes = scheduleNotes.trim() || undefined;
    const nextDueAtISO = parseDateInputToISO(nextDueStr);
    if (!nextDueAtISO) return undefined;
    return { interval: 'once', nextDueAtISO, notes };
  }

  function setNextDueFromServiceDate(months: number) {
    const serviceISO = parseDateInputToISO(dateStr);
    if (!serviceISO) {
      Alert.alert('Invalid date', 'Enter a valid service date first (MM/DD/YYYY).');
      return;
    }
    markDirty();
    setNextDueStr(dateInputValue(addMonths(serviceISO, months)));
  }

  function selectEventType(t: ItemEventType) {
    markDirty();
    setEventType(t);
  }

  function handleServiceCompletedChange(on: boolean) {
    markDirty();
    setServiceCompleted(on);
    const prior = existing ?? completeFrom;
    if (on) {
      const currentISO = parseDateInputToISO(dateStr);
      const dueAt = prior ? upcomingDueAtISO(prior) : undefined;
      if (
        prior &&
        (!currentISO ||
          sameCalendarDay(currentISO, prior.occurredAtISO) ||
          sameCalendarDay(currentISO, dueAt))
      ) {
        setDateStr(dateInputValue(nowISO()));
      }
    } else if (prior) {
      const dueAt = upcomingDueAtISO(prior);
      setDateStr(dateInputValue(dueAt ?? prior.occurredAtISO));
    }
  }

  function buildRecurrenceForNextDue(nextDueAtISO: string): ItemEventRecurrence | undefined {
    if (!recurring) return undefined;
    const notes = scheduleNotes.trim() || undefined;
    return { interval: 'once', nextDueAtISO, notes };
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

    const updatingReminder =
      showServiceCompletedToggle && !serviceCompleted && Boolean(existing ?? completeFrom);

    if (recurring && !updatingReminder) {
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
    const scheduleNoteText = scheduleNotes.trim() || undefined;
    const baseRecurrence = isPastHistoryEdit
      ? existing?.recurrence
      : updatingReminder
        ? recurring
          ? buildRecurrenceForNextDue(occurredAtISO)
          : undefined
        : buildRecurrence();
    // Future-dated logs keep a nextDue so they stay on Schedule after the date ages.
    const recurrence =
      isPastHistoryEdit || updatingReminder
        ? baseRecurrence
        : ensureFutureDatedEventScheduled(occurredAtISO, baseRecurrence, scheduleNoteText);
    if (!isPastHistoryEdit && recurring && !recurrence) {
      Alert.alert('Schedule incomplete', 'Enter a next due date for the scheduled service.');
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
        serviceCompany: serviceCompany.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        recurrence: isPastHistoryEdit ? existing?.recurrence : recurrence,
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

    if (existing || (completeFrom && updatingReminder)) {
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

      // Editing an open reminder on a future-dated visit: the date field shows the
      // planned service date, so the entered date must move the occurrence and the
      // matching next-due instead of being discarded.
      const targetShownDueISO = upcomingDueAtISO(target);
      const reschedulingPlannedVisit =
        updatingReminder && !recurring && isAfterToday(target.occurredAtISO);
      const rescheduledOccurredAtISO =
        reschedulingPlannedVisit && sameCalendarDay(target.occurredAtISO, targetShownDueISO)
          ? occurredAtISO
          : target.occurredAtISO;

      const updatedRecurrence = isPastHistoryEdit
        ? target.recurrence
        : updatingReminder
          ? recurring
            ? recurrence
            : reschedulingPlannedVisit && target.recurrence
              ? {
                  ...target.recurrence,
                  nextDueAtISO: sameCalendarDay(
                    target.recurrence.nextDueAtISO,
                    targetShownDueISO
                  )
                    ? occurredAtISO
                    : target.recurrence.nextDueAtISO,
                  notes: scheduleNoteText,
                }
              : undefined
          : recurrence;

      const updated: ItemEvent = {
        ...target,
        title: trimmed,
        eventType,
        // Updating a schedule reminder: keep the last service date (the date field
        // is the next due) unless this reschedules a future planned visit.
        occurredAtISO: updatingReminder ? rescheduledOccurredAtISO : occurredAtISO,
        notes: notes.trim() || undefined,
        serviceCompany: serviceCompany.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        recurrence: updatedRecurrence,
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
        serviceCompany: serviceCompany.trim() || undefined,
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

  function confirmCancel() {
    if (!dirtyRef.current) {
      onBack();
      return;
    }
    Alert.alert('Unsaved changes', 'You have entered data that will be lost if you leave.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onBack },
      { text: 'Save', onPress: () => saveEvent() },
    ]);
  }

  function confirmDelete() {
    if (!deletableEvent) return;
    const isScheduleReminder = Boolean(deletableEvent.recurrence?.nextDueAtISO);
    Alert.alert(
      isScheduleReminder ? 'Delete scheduled service?' : 'Delete event?',
      isScheduleReminder
        ? 'This removes the service from the schedule. Attached photos will also be removed.'
        : 'Photos attached to this event will also be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const p of photosForEvent(state, deletableEvent.id)) {
              await deletePhotoFile(p.localUri);
            }
            onSave(deleteEventCascade(state, deletableEvent.id));
            onBack();
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader onPress={confirmCancel} label="← Cancel">
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {deletableEvent ? (
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
            markDirty();
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
              No other service events for this asset yet. Past logs will show here.
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

        <Text style={sharedStyles.fieldLabel}>
          {showServiceCompletedToggle && !serviceCompleted
            ? 'Next service date (MM/DD/YYYY)'
            : 'Date (MM/DD/YYYY)'}
        </Text>
        <TextInput
          value={dateStr}
          onChangeText={(v) => {
            markDirty();
            setDateStr(v);
          }}
          style={sharedStyles.input}
          placeholder="03/15/2026"
        />

        <Text style={sharedStyles.fieldLabel}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={(v) => {
            markDirty();
            setNotes(v);
          }}
          style={[sharedStyles.input, sharedStyles.inputMultiline]}
          multiline
          placeholder="What was done, who performed the work…"
        />

        <Text style={sharedStyles.fieldLabel}>Service company</Text>
        <TextInput
          value={serviceCompany}
          onChangeText={(v) => {
            markDirty();
            setServiceCompany(v);
          }}
          style={sharedStyles.input}
          placeholder="Company that performed the service"
          autoCapitalize="words"
        />

        <Text style={sharedStyles.fieldLabel}>Cost</Text>
        <TextInput
          value={costStr}
          onChangeText={(v) => {
            markDirty();
            setCostStr(v);
          }}
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
          onToggleFavorite={handleEventPhotoFavorite}
        />

        {showScheduleNextControls ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <Text style={sharedStyles.fieldLabel}>Schedule next service</Text>
              <Switch
                value={recurring}
                onValueChange={(value) => {
                  markDirty();
                  setRecurring(value);
                }}
              />
            </View>

            {recurring ? (
              <>
                <Text style={sharedStyles.fieldLabel}>Next due date (MM/DD/YYYY)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {(
                    [
                      { months: 1, label: '1 Month' },
                      { months: 3, label: '3 Month' },
                      { months: 6, label: '6 Month' },
                      { months: 12, label: '1 Year' },
                    ] as const
                  ).map((opt) => {
                    const serviceISO = parseDateInputToISO(dateStr);
                    const presetISO = serviceISO
                      ? addMonths(serviceISO, opt.months)
                      : undefined;
                    const selected = Boolean(
                      presetISO && sameCalendarDay(presetISO, parseDateInputToISO(nextDueStr))
                    );
                    return (
                      <Pressable
                        key={opt.months}
                        onPress={() => setNextDueFromServiceDate(opt.months)}
                        accessibilityState={{ selected }}
                        style={[
                          sharedStyles.secondaryBtn,
                          { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 },
                          selected && {
                            borderColor: colors.primary,
                            backgroundColor: colors.upcomingCardBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            sharedStyles.secondaryBtnText,
                            selected && { fontWeight: '700' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  ref={nextDueInputRef}
                  value={nextDueStr}
                  onChangeText={(v) => {
                    markDirty();
                    setNextDueStr(v);
                  }}
                  onFocus={() => measureAndScroll(nextDueInputRef.current)}
                  style={sharedStyles.input}
                  placeholder="06/15/2027"
                />

                <Text style={sharedStyles.fieldLabel}>Notes</Text>
                <TextInput
                  ref={scheduleNotesInputRef}
                  value={scheduleNotes}
                  onChangeText={(v) => {
                    markDirty();
                    setScheduleNotes(v);
                  }}
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
                    selected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.upcomingCardBg,
                    },
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
                      <MaterialIcons name="check" size={20} color={colors.primary} />
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
