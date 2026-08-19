import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Text, TextInput } from '../textScale';
import type { TextInput as RNTextInput } from 'react-native';
import type { ScrollView as RNScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, ItemEvent, ItemEventRecurrence, ItemEventType, ItemPhoto } from '../types';
import { EventPhotoSection } from '../components/EventPhotoSection';
import { EventListRow } from '../components/ListRows';
import { boldTodayNodes } from '../components/TextWithBoldToday';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import { EventExportSheet } from '../components/EventExportSheet';
import { SharePhotoModeModal } from '../components/SharePhotoModeModal';
import { DateInputField } from '../components/DateInputField';
import { DetailDisplayRow } from '../components/DetailDisplayRow';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import {
  uid,
  nowISO,
  dateInputPlaceholder,
  dateInputValue,
  parseDateInputToISO,
  parseDateInputValue,
  formatDisplayDate,
  formatCurrency,
} from '../utils';
import {
  deleteEventCascade,
  firstPhotoUriForItem,
  itemById,
  photosForEvent,
  propertyById,
  roomById,
  roomsForProperty,
  itemsForRoom,
  serviceHistoryEventsForItem,
} from '../storage';
import { itemDisplayLabel } from '../itemCatalog';
import { isEmptyInventoryItem } from '../itemListSummaryFields';
import {
  authenticateForRoom,
  isRoomUnlocked,
  markRoomUnlocked,
} from '../roomAuth';
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
import { pickFileAttachment } from '../fileAttachment';
import { deleteDocumentFile } from '../documentStorage';
import {
  addEventExtraDocuments,
  addStandaloneDocuments,
  eventExtraDocumentRows,
  eventExtraDocumentRowsFromIds,
  removeEventExtraDocument,
  removeStandaloneDocuments,
} from '../eventExtraDocuments';
import { isPinned, togglePin } from '../pins';
import { PinGearMenuItem } from '../components/PinGearMenuItem';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { withReusePhotoMeta } from '../reuseExistingPhotos';
import { reorderItemsById, type PhotoReorderDirection } from '../photoReorder';
import {
  buildEventExportSnapshot,
  scheduleLabelFromRecurrence,
  type EventExportSnapshot,
} from '../eventExportContent';
import { hasFavoritePhotos, type SharePhotoMode } from '../sharePhotoMode';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { buildExportPdfHtml, eventSnapshotToPdfDoc } from '../exportPdfHtml';

type HistoryMode = 'related' | 'all';

const headerIconBtn = {
  width: 42,
  height: 36,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  borderRadius: 4,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: 'transparent' as const,
};

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
  /** When set at open (ItemDetail + / edit / log), asset is locked — no location pickers. */
  itemId?: string;
  /** Preselect when creating without a locked item (e.g. from Property gear). */
  propertyId?: string;
  roomId?: string;
  eventId?: string;
  /** When set, creating a new event that completes this reminder. */
  completeFromEventId?: string;
  onBack: () => void;
  onSave: (state: AppState) => void;
  onOpenRoom?: (roomId: string) => void;
}) {
  const {
    state,
    itemId: lockedItemId,
    propertyId: routePropertyId,
    roomId: routeRoomId,
    eventId,
    completeFromEventId,
    onBack,
    onSave,
    onOpenRoom,
  } = props;
  const insets = useSafeAreaInsets();
  /** Create from Property (or similar): pick Property → Room → Asset before save. */
  const showLocationPickers = !lockedItemId && !eventId && !completeFromEventId;
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(
    () => routePropertyId
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(() => routeRoomId);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [roomAuthEpoch, setRoomAuthEpoch] = useState(0);
  const itemId = lockedItemId ?? selectedItemId;
  const item = itemId ? itemById(state, itemId) : undefined;
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

  const [isEditing, setIsEditing] = useState(!existing);
  const [isDirty, setIsDirty] = useState(false);
  const [title, setTitle] = useState(existing?.title ?? fromReminder.title);
  const [eventType, setEventType] = useState<ItemEventType>(
    existing?.eventType ?? fromReminder.eventType
  );
  const [serviceCompleted, setServiceCompleted] = useState(() => {
    // Explicit "log service" path starts completed; editing an open reminder stays open.
    if (completeFrom) return true;
    return false;
  });
  const [dateStr, setDateStr] = useState(() => {
    // Logging a completion (from schedule or overdue reminder): default to today.
    if (completeFrom) return dateInputValue(nowISO());
    if (existing?.recurrence?.nextDueAtISO) {
      const dueAt = upcomingDueAtISO(existing);
      // Editing an open reminder: show the scheduled due date from the list.
      if (dueAt) return dateInputValue(dueAt);
    }
    if (existing) return dateInputValue(existing.occurredAtISO);
    return dateInputValue(nowISO());
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [serviceCompany, setServiceCompany] = useState(existing?.serviceCompany ?? '');
  const [costStr, setCostStr] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [recurring, setRecurring] = useState(false);
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
  const [pendingDocumentIds, setPendingDocumentIds] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleTouched, setTitleTouched] = useState(
    Boolean(existing?.title) || Boolean(completeFrom?.title)
  );
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<HistoryMode>('related');
  const [exportSnapshot, setExportSnapshot] = useState<EventExportSnapshot | null>(null);
  const [sharingPng, setSharingPng] = useState(false);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [sharePhotoMode, setSharePhotoMode] = useState<SharePhotoMode>('all');
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  const exportRef = useRef<View>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const nextDueFieldRef = useRef<View>(null);
  const scheduleNotesInputRef = useRef<RNTextInput>(null);
  const dirtyRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'addEditEventDone',
    // Native InputAccessoryView is unreliable here; overlay matches Item Detail / popups.
    variant: 'overlay',
  });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const clearDirty = useCallback(() => {
    dirtyRef.current = false;
    setIsDirty(false);
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
    (node: { measureInWindow: View['measureInWindow'] } | null) => {
      // Defer so layout reflects the focused field before measuring.
      requestAnimationFrame(() => {
        node?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
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
    () =>
      itemId
        ? serviceHistoryEventsForItem(state, itemId).filter((e) => e.id !== existing?.id)
        : [],
    [state, itemId, existing?.id]
  );

  const propertiesForPicker = useMemo(
    () => [...state.properties].sort((a, b) => a.name.localeCompare(b.name)),
    [state.properties]
  );

  const roomsForPicker = useMemo(() => {
    if (!selectedPropertyId) return [];
    return roomsForProperty(state, selectedPropertyId);
  }, [state, selectedPropertyId]);

  const assetsForPicker = useMemo(() => {
    if (!selectedRoomId) return [];
    void roomAuthEpoch;
    return itemsForRoom(state, selectedRoomId).filter((entry) => {
      if (isEmptyInventoryItem(entry)) return false;
      const entryRoom = roomById(state, entry.roomId);
      if (!entryRoom || entryRoom.requiresAuth !== true) return true;
      return isRoomUnlocked(entryRoom.id);
    });
  }, [state, selectedRoomId, roomAuthEpoch]);

  const selectedProperty = selectedPropertyId
    ? propertyById(state, selectedPropertyId)
    : undefined;
  const selectedRoom = selectedRoomId ? roomById(state, selectedRoomId) : undefined;
  const relatedPastEvents = useMemo(() => {
    const key = title.trim().toLowerCase();
    if (!key) return [];
    return allPastEvents.filter((e) => e.title.trim().toLowerCase() === key);
  }, [allPastEvents, title]);
  const historyEvents = historyMode === 'all' ? allPastEvents : relatedPastEvents;
  const titleKey = title.trim().toLowerCase();
  const parsedEventDate = parseDateInputToISO(dateStr);
  const viewedEvent = existing ?? completeFrom;
  const viewedIsDone = Boolean(viewedEvent && !viewedEvent.recurrence?.nextDueAtISO);
  const lastServiceISO =
    viewedIsDone && viewedEvent
      ? viewedEvent.occurredAtISO
      : itemId
        ? serviceHistoryEventsForItem(state, itemId)[0]?.occurredAtISO
        : undefined;
  const nextServiceISO =
    upcomingDueAtISO(existing ?? completeFrom) ??
    (showServiceCompletedToggle ? parsedEventDate : undefined);
  const lastServiceValue =
    lastServiceISO &&
    (!nextServiceISO || !sameCalendarDay(lastServiceISO, nextServiceISO))
      ? formatDisplayDate(lastServiceISO)
      : undefined;
  const nextServiceValue = nextServiceISO ? formatDisplayDate(nextServiceISO) : undefined;
  const eventDateIsFuture = Boolean(parsedEventDate && isAfterToday(parsedEventDate));
  const occurrenceIsFuture = Boolean(existing && isAfterToday(existing.occurredAtISO));
  /**
   * Hide Schedule next service while an open reminder is still incomplete.
   * Future-dated events cannot schedule a follow-up; once Service completed is Yes,
   * the form date is the service date — allow scheduling from that (typically today).
   */
  const showScheduleNextControls =
    showScheduleControls &&
    (!showServiceCompletedToggle || serviceCompleted) &&
    !eventDateIsFuture &&
    (serviceCompleted || !occurrenceIsFuture);

  const eventHasFavoritePhotos = useMemo(
    () => hasFavoritePhotos(eventPhotos),
    [eventPhotos]
  );

  const runEventShare = useCallback(
    async (photoMode: SharePhotoMode = 'all', format: ShareFormat = DEFAULT_SHARE_FORMAT) => {
      const occurredAtISO = parseDateInputToISO(dateStr);
      if (!occurredAtISO) {
        Alert.alert(
          'Share failed',
          `Enter a valid service date (${dateInputPlaceholder()}) before sharing.`
        );
        return;
      }
      const cost = costStr.trim() ? parseFloat(costStr) : undefined;
      const draftRecurrence =
        recurring && parseDateInputToISO(nextDueStr)
          ? {
              interval: 'once' as const,
              nextDueAtISO: parseDateInputToISO(nextDueStr)!,
              notes: scheduleNotes.trim() || undefined,
            }
          : undefined;
      if (!itemId) {
        Alert.alert('Share failed', 'Select an asset before sharing.');
        return;
      }
      const snapshot = buildEventExportSnapshot({
        state,
        itemId,
        title: title.trim() || 'Service event',
        eventType,
        occurredAtISO,
        notes: notes.trim() || undefined,
        serviceCompany: serviceCompany.trim() || undefined,
        cost: cost != null && !Number.isNaN(cost) ? cost : undefined,
        scheduleLabel: scheduleLabelFromRecurrence(draftRecurrence),
        photos: eventPhotos,
        photoMode,
      });
      if (!snapshot) {
        Alert.alert('Share failed', 'Could not build service event summary.');
        return;
      }
      setShareOptionsOpen(false);
      if (format === 'pdf') {
        setSharingPng(true);
        try {
          const html = await buildExportPdfHtml(eventSnapshotToPdfDoc(snapshot));
          await shareHtmlAsPdf(html, `Share ${snapshot.title}`);
        } finally {
          setSharingPng(false);
        }
        return;
      }
      setExportSnapshot(snapshot);
      setSharingPng(true);
    },
    [
      costStr,
      dateStr,
      eventPhotos,
      eventType,
      itemId,
      nextDueStr,
      notes,
      recurring,
      scheduleNotes,
      serviceCompany,
      state,
      title,
    ]
  );

  const onSharePress = useCallback(() => {
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert(
        'Share failed',
        `Enter a valid service date (${dateInputPlaceholder()}) before sharing.`
      );
      return;
    }
    setSharePhotoMode('all');
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, [dateStr]);

  useEffect(() => {
    if (!exportSnapshot || !sharingPng) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        await shareViewAsPng(exportRef, `Share ${exportSnapshot.title}`);
        if (!cancelled) {
          setExportSnapshot(null);
          setSharingPng(false);
        }
      })();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exportSnapshot, sharingPng]);

  if (lockedItemId && !item) {
    return (
      <View
        style={[
          sharedStyles.screen,
          { paddingTop: insets.top, padding: 16, backgroundColor: colors.upcomingCardBg },
        ]}
      >
        <Text style={sharedStyles.emptyText}>Asset not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const itemThumbUri = item ? firstPhotoUriForItem(state, item) : undefined;
  const itemLabel = item ? itemDisplayLabel(item) : undefined;
  const itemRoom = item ? roomById(state, item.roomId) : undefined;
  const itemProperty = itemRoom
    ? propertyById(state, itemRoom.propertyId)
    : undefined;
  /** Locked-asset path has no property picker — always surface which property/room this service belongs to. */
  const contextPropertyName =
    !showLocationPickers
      ? (itemProperty?.name ?? selectedProperty?.name)
      : undefined;
  const contextRoomName = !showLocationPickers ? itemRoom?.name : undefined;
  const contextLocationLabel = [contextPropertyName, contextRoomName]
    .filter(Boolean)
    .join(' · ');
  const canOpenRoom = Boolean(onOpenRoom && itemRoom);
  const dateFieldLabel =
    showServiceCompletedToggle && !serviceCompleted ? 'Next service date' : 'Date';
  const costNum = costStr.trim() ? parseFloat(costStr) : undefined;
  const costDisplay =
    costNum != null && !Number.isNaN(costNum) ? formatCurrency(costNum) : undefined;
  const nextDueISO = parseDateInputToISO(nextDueStr);
  const screenTitle = existing
    ? isEditing
      ? 'Edit service event'
      : 'Service event'
    : showServiceCompletedToggle
      ? serviceCompleted
        ? 'Log scheduled service'
        : 'Edit service event'
      : 'New Service Event';
  const propertyPickerLabel = selectedProperty?.name ?? 'Select property';
  const roomPickerLabel = selectedRoom?.name ?? 'Select room';
  const assetPickerLabel = itemLabel ?? 'Select asset';

  function openPropertyPicker() {
    if (propertiesForPicker.length === 0) {
      Alert.alert('No properties', 'Add a property before logging a service event.');
      return;
    }
    Alert.alert(
      'Property',
      undefined,
      [
        ...propertiesForPicker.map((property) => ({
          text: property.name,
          onPress: () => {
            markDirty();
            setSelectedPropertyId(property.id);
            setSelectedRoomId(undefined);
            setSelectedItemId(undefined);
          },
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  async function selectRoom(roomId: string) {
    const room = roomById(state, roomId);
    if (!room) return;
    if (room.requiresAuth === true && !isRoomUnlocked(room.id)) {
      const ok = await authenticateForRoom(room.name);
      if (!ok) return;
      markRoomUnlocked(room.id);
      setRoomAuthEpoch((n) => n + 1);
    }
    markDirty();
    setSelectedRoomId(room.id);
    setSelectedItemId(undefined);
  }

  function openRoomPicker() {
    if (!selectedPropertyId) {
      Alert.alert('Select a property', 'Choose a property before selecting a room.');
      return;
    }
    if (roomsForPicker.length === 0) {
      Alert.alert('No rooms', 'Add a room to this property before logging a service event.');
      return;
    }
    Alert.alert(
      'Room',
      undefined,
      [
        ...roomsForPicker.map((room) => ({
          text: room.name,
          onPress: () => {
            void selectRoom(room.id);
          },
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function openAssetPicker() {
    if (!selectedRoomId) {
      Alert.alert('Select a room', 'Choose a room before selecting an asset.');
      return;
    }
    if (assetsForPicker.length === 0) {
      Alert.alert(
        'No assets',
        'This room has no assets available. Unlock the room if needed, or add an asset first.'
      );
      return;
    }
    Alert.alert(
      'Asset',
      undefined,
      [
        ...assetsForPicker.map((entry) => ({
          text: itemDisplayLabel(entry),
          onPress: () => {
            markDirty();
            setSelectedItemId(entry.id);
          },
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function persistEventPhotos(nextPhotos: ItemPhoto[]) {
    if (!existing) return;
    const photoIds = nextPhotos.map((p) => p.id);
    const removedPhotoIds = new Set(
      photosForEvent(state, existing.id)
        .map((p) => p.id)
        .filter((id) => !photoIds.includes(id))
    );
    const updatedPhotos = nextPhotos.map((p) => ({ ...p, eventId: existing.id }));
    const keptPhotos = state.photos.filter(
      (p) => p.eventId !== existing.id || !removedPhotoIds.has(p.id)
    );
    const brandNew = updatedPhotos.filter((p) => !state.photos.some((x) => x.id === p.id));
    onSave({
      ...state,
      photos: [...keptPhotos, ...brandNew],
      events: state.events.map((e) => (e.id === existing.id ? { ...e, photoIds } : e)),
    });
  }

  async function addReceiptPhoto(sourceUri: string) {
    if (!itemId) {
      Alert.alert('Asset required', 'Select an asset before adding photos.');
      return;
    }
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
    const nextPhotos = [...eventPhotos.filter((p) => p.caption !== 'receipt'), newPhoto];
    setEventPhotos(nextPhotos);
    // View mode on an existing event: persist immediately (like Interaction labels).
    if (!isEditing && existing) {
      persistEventPhotos(nextPhotos);
    } else {
      markDirty();
    }
  }

  async function addEventPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    if (!itemId) {
      Alert.alert('Asset required', 'Select an asset before adding photos.');
      return [];
    }
    const newPhotos: ItemPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return withReusePhotoMeta(sourceUri, {
          id: photoId,
          itemId,
          eventId: existing?.id,
          localUri,
          createdAtISO: nowISO(),
        });
      })
    );
    const nextPhotos = [...eventPhotos, ...newPhotos];
    setEventPhotos(nextPhotos);
    if (!isEditing && existing) {
      persistEventPhotos(nextPhotos);
    } else {
      markDirty();
    }
    return newPhotos.map((photo) => photo.id);
  }

  async function handleAddDocuments(
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) {
    const completingNow = showServiceCompletedToggle && serviceCompleted;
    if (existing && !completingNow) {
      onSave(await addEventExtraDocuments(state, existing.id, picked));
      return;
    }
    const { state: next, documentIds } = await addStandaloneDocuments(state, picked);
    onSave(next);
    setPendingDocumentIds((prev) => [...prev, ...documentIds]);
    markDirty();
  }

  function startLoadFile() {
    void pickFileAttachment()
      .then((picked) => {
        setMenuOpen(false);
        if (!picked) return;
        if (picked.kind === 'image') {
          void addEventPhotos([picked.uri]);
          return;
        }
        void handleAddDocuments([picked]);
      })
      .catch(() => {
        setMenuOpen(false);
      });
  }

  function handleDeleteEventDocument(documentId: string) {
    const completingNow = showServiceCompletedToggle && serviceCompleted;
    if (existing && !completingNow) {
      void removeEventExtraDocument(state, existing.id, documentId).then(onSave);
      return;
    }
    setPendingDocumentIds((prev) => prev.filter((id) => id !== documentId));
    void removeStandaloneDocuments(state, [documentId]).then(onSave);
    markDirty();
  }

  const extraDocumentRows =
    existing && !(showServiceCompletedToggle && serviceCompleted)
      ? eventExtraDocumentRows(state, existing, handleDeleteEventDocument)
      : eventExtraDocumentRowsFromIds(state, pendingDocumentIds, handleDeleteEventDocument);

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

  function reorderEventPhoto(photoId: string, direction: PhotoReorderDirection) {
    markDirty();
    setEventPhotos((prev) =>
      reorderItemsById(prev, photoId, direction, (photo) => photo.caption !== 'receipt')
    );
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
      Alert.alert(
        'Invalid date',
        `Enter a valid service date first (${dateInputPlaceholder()}).`
      );
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
    if (!itemId || !item) {
      Alert.alert('Asset required', 'Select a property, room, and asset before saving.');
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Enter a service event title.');
      return;
    }
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert('Invalid date', `Enter the date as ${dateInputPlaceholder()}.`);
      return;
    }

    const updatingReminder =
      showServiceCompletedToggle && !serviceCompleted && Boolean(existing ?? completeFrom);

    if (recurring && !updatingReminder) {
      const nextDueAtISO = parseDateInputToISO(nextDueStr);
      if (!nextDueAtISO) {
        Alert.alert(
          'Invalid next due date',
          `Enter the next due date as ${dateInputPlaceholder()}.`
        );
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
        documentIds: pendingDocumentIds,
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

      // Editing an open reminder: the date field is "Next service date". Always apply it
      // as nextDue. For a future planned visit, also move occurredAt so Room/Schedule
      // (which use the earliest of nextDue and future occurredAt) do not keep the old day.
      const targetShownDueISO = upcomingDueAtISO(target);
      const plannedFutureVisit =
        updatingReminder && isAfterToday(target.occurredAtISO);
      const movePlannedOccurrence =
        plannedFutureVisit &&
        (sameCalendarDay(target.occurredAtISO, targetShownDueISO) ||
          sameCalendarDay(target.occurredAtISO, target.recurrence?.nextDueAtISO));
      const rescheduledOccurredAtISO = movePlannedOccurrence
        ? occurredAtISO
        : target.occurredAtISO;

      const updatedRecurrence = isPastHistoryEdit
        ? target.recurrence
        : updatingReminder
          ? recurring
            ? buildRecurrenceForNextDue(occurredAtISO)
            : plannedFutureVisit || target.recurrence?.nextDueAtISO
              ? {
                  interval: 'once' as const,
                  nextDueAtISO: occurredAtISO,
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
        documentIds: [
          ...new Set([...(target.documentIds ?? []), ...pendingDocumentIds]),
        ],
      };
      onSave({
        ...state,
        photos: [...keptPhotos, ...newPhotos],
        events: state.events.map((e) => (e.id === target.id ? updated : e)),
      });
      if (existing) {
        clearDirty();
        setIsEditing(false);
        return;
      }
      onBack();
      return;
    } else {
      const newEventId = uid('event');
      const photoRecords = eventPhotos.map((p) => ({
        ...p,
        itemId,
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
        documentIds: pendingDocumentIds,
      };
      onSave({
        ...state,
        photos: [...state.photos, ...photoRecords],
        events: [...state.events, event],
      });
    }
    onBack();
  }

  function resetDraftFromExisting() {
    if (!existing) return;
    setTitle(existing.title);
    setEventType(existing.eventType);
    setServiceCompleted(false);
    if (existing.recurrence?.nextDueAtISO) {
      const dueAt = upcomingDueAtISO(existing);
      setDateStr(dateInputValue(dueAt ?? existing.occurredAtISO));
    } else {
      setDateStr(dateInputValue(existing.occurredAtISO));
    }
    setNotes(existing.notes ?? '');
    setServiceCompany(existing.serviceCompany ?? '');
    setCostStr(existing.cost != null ? String(existing.cost) : '');
    setRecurring(false);
    setNextDueStr(
      existing.recurrence?.nextDueAtISO
        ? dateInputValue(existing.recurrence.nextDueAtISO)
        : ''
    );
    setScheduleNotes(existing.recurrence?.notes ?? '');
    setEventPhotos(photosForEvent(state, existing.id));
    setTitleTouched(Boolean(existing.title));
    setPendingDocumentIds([]);
    clearDirty();
  }

  async function discardPendingDocuments() {
    if (pendingDocumentIds.length === 0) return;
    const ids = pendingDocumentIds;
    setPendingDocumentIds([]);
    onSave(await removeStandaloneDocuments(state, ids));
  }

  function cancelEditing() {
    void discardPendingDocuments().then(() => {
      if (existing) {
        resetDraftFromExisting();
        setIsEditing(false);
        return;
      }
      onBack();
    });
  }

  function handleHeaderBack() {
    if (!isEditing) {
      onBack();
      return;
    }
    if (existing) {
      if (!dirtyRef.current) {
        setIsEditing(false);
        return;
      }
      Alert.alert('Unsaved changes', 'You have entered data that will be lost if you leave.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: cancelEditing },
        { text: 'Save', onPress: () => saveEvent() },
      ]);
      return;
    }
    if (!dirtyRef.current) {
      onBack();
      return;
    }
    Alert.alert('Unsaved changes', 'You have entered data that will be lost if you leave.', [
      { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void discardPendingDocuments().then(onBack);
          },
        },
      { text: 'Save', onPress: () => saveEvent() },
    ]);
  }

  function confirmDelete() {
    if (!deletableEvent) return;
    const isScheduleReminder = Boolean(deletableEvent.recurrence?.nextDueAtISO);
    Alert.alert(
      isScheduleReminder ? 'Delete scheduled service?' : 'Delete event?',
      isScheduleReminder
        ? 'This removes the service from the schedule. Attached photos and files will also be removed.'
        : 'Photos and files attached to this event will also be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const p of photosForEvent(state, deletableEvent.id)) {
              await deletePhotoFile(p.localUri);
            }
            const dropDocIds = new Set([
              ...(deletableEvent.documentIds ?? []),
              ...pendingDocumentIds,
            ]);
            for (const documentId of dropDocIds) {
              const doc = state.documents.find((d) => d.id === documentId);
              if (doc) await deleteDocumentFile(doc.localUri);
            }
            const afterEvent = deleteEventCascade(state, deletableEvent.id);
            onSave({
              ...afterEvent,
              documents: afterEvent.documents.filter((d) => !dropDocIds.has(d.id)),
            });
            onBack();
          },
        },
      ]
    );
  }

  const reusePropertyId =
    itemProperty?.id ?? selectedPropertyId ?? routePropertyId ?? '';

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={reusePropertyId}>
    <KeyboardAvoidingView
      style={[
        sharedStyles.screen,
        { paddingTop: insets.top, backgroundColor: colors.upcomingCardBg },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader onPress={handleHeaderBack} label={isDirty ? '← Cancel' : '← Back'}>
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Pressable
            onPress={onSharePress}
            disabled={sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Share service event"
            accessibilityHint="Creates an image of this service event and opens the share sheet."
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
                opacity: sharingPng ? 0.6 : 1,
              },
              pressed && !sharingPng && { opacity: 0.8 },
            ]}
          >
            {sharingPng ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="ios-share" size={22} color={colors.primary} />
            )}
          </Pressable>
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Service event options"
            accessibilityHint="Opens actions like load file."
            hitSlop={8}
            style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="settings" size={22} color={colors.primary} />
          </Pressable>
          {deletableEvent ? (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete event"
              hitSlop={8}
              style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="delete" size={22} color={colors.danger} />
            </Pressable>
          ) : null}
          {isEditing ? (
            <Pressable
              onPress={saveEvent}
              accessibilityRole="button"
              accessibilityLabel="Save service event"
              hitSlop={8}
              style={({ pressed }) => [
                {
                  width: 42,
                  height: 36,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialIcons name="check" size={22} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setRecurring(false);
                setIsEditing(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit service event"
              accessibilityHint="Switches to edit mode."
              hitSlop={8}
              style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="edit" size={22} color={colors.editIcon} />
            </Pressable>
          )}
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
        {showLocationPickers ? (
          <>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{screenTitle}</Text>
            <Text style={sharedStyles.fieldLabel}>Property</Text>
            <Pressable
              onPress={openPropertyPicker}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityHint="Opens a list of properties"
            >
              <Text style={{ fontSize: 16, color: colors.text }}>{propertyPickerLabel}</Text>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </Pressable>
            <Text style={sharedStyles.fieldLabel}>Room</Text>
            <Pressable
              onPress={openRoomPicker}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityHint="Opens a list of rooms for the selected property"
            >
              <Text style={{ fontSize: 16, color: colors.text }}>{roomPickerLabel}</Text>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </Pressable>
            <Text style={sharedStyles.fieldLabel}>Asset</Text>
            <Pressable
              onPress={openAssetPicker}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityHint="Opens a list of assets for the selected room"
            >
              <Text style={{ fontSize: 16, color: colors.text }}>{assetPickerLabel}</Text>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={
                canOpenRoom && itemRoom ? () => onOpenRoom?.(itemRoom.id) : undefined
              }
              disabled={!canOpenRoom}
              accessibilityRole={canOpenRoom ? 'button' : undefined}
              accessibilityLabel={
                canOpenRoom && itemRoom ? `Open room ${itemRoom.name}` : undefined
              }
              accessibilityHint={
                canOpenRoom ? 'Opens the room for this asset.' : undefined
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
                opacity: canOpenRoom && pressed ? 0.7 : 1,
              })}
            >
              {itemThumbUri ? (
                <Image
                  source={{ uri: itemThumbUri }}
                  accessibilityLabel={`${itemLabel ?? 'Asset'} photo`}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    backgroundColor: colors.border,
                  }}
                />
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[sharedStyles.title, { marginBottom: 0 }]} numberOfLines={2}>
                  {itemLabel}
                </Text>
                {contextLocationLabel ? (
                  <Text
                    style={[
                      sharedStyles.subtitle,
                      {
                        marginBottom: 0,
                        marginTop: 2,
                        ...(canOpenRoom ? { color: colors.primary } : null),
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {contextLocationLabel}
                  </Text>
                ) : null}
              </View>
              {canOpenRoom ? (
                <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{screenTitle}</Text>
          </>
        )}
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
              Missed service — due {boldTodayNodes(formatDisplayDate(activeDueAt))}
              {activeDaysLate > 0
                ? ` · ${activeDaysLate} day${activeDaysLate === 1 ? '' : 's'} late`
                : ''}
            </Text>
          </View>
        ) : null}
        {isEditing && showServiceCompletedToggle ? (
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
        ) : isEditing ? (
          <Text style={sharedStyles.subtitle}>
            Record maintenance, repairs, or inspections. Add receipt and parts photos below.
          </Text>
        ) : null}

        {isEditing ? (
          <>
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
              {...keyboardDone.textInputProps}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 0 }]}>
            <DetailDisplayRow label="Title" value={title} />
            <DetailDisplayRow label="Type" value={EVENT_TYPE_LABELS[eventType]} />
            {lastServiceValue ? (
              <DetailDisplayRow label="Last service" value={lastServiceValue} stacked />
            ) : null}
            {nextServiceValue ? (
              <DetailDisplayRow label="Next service" value={nextServiceValue} stacked />
            ) : null}
            <DetailDisplayRow label="Notes" value={notes} stacked />
            <DetailDisplayRow label="Service company" value={serviceCompany} />
            <DetailDisplayRow label="Cost" value={costDisplay} />
          </View>
        )}

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
                const historyPhotos = photosForEvent(state, e.id);
                return (
                  <EventListRow
                    key={e.id}
                    title={e.title}
                    eventTypeLabel={EVENT_TYPE_LABELS[e.eventType]}
                    dateLabel={formatDisplayDate(e.occurredAtISO)}
                    costLabel={e.cost != null ? formatCurrency(e.cost) : undefined}
                    notes={e.notes}
                    thumbnailUri={historyPhotos[0]?.localUri}
                    cardBackgroundColor={colors.upcomingCardBg}
                  />
                );
              })}
            </View>
          )}
        </View>

        {isEditing ? (
          <>
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

            <DateInputField
              label={dateFieldLabel}
              value={dateStr}
              onChangeText={(v) => {
                markDirty();
                setDateStr(v);
              }}
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
              {...keyboardDone.textInputProps}
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
              {...keyboardDone.textInputProps}
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
              {...keyboardDone.textInputProps}
            />
          </>
        ) : null}

        <View style={{ height: 24 }} />

        <EventPhotoSection
          photos={eventPhotos}
          onAddReceipt={addReceiptPhoto}
          onAddPhotos={addEventPhotos}
          onAddDocuments={handleAddDocuments}
          extraDocumentRows={extraDocumentRows}
          onDeletePhoto={
            isEditing
              ? (photoId) => {
                  void removeEventPhoto(photoId);
                }
              : undefined
          }
          onReorderPhoto={isEditing ? reorderEventPhoto : undefined}
          onLabelPhoto={isEditing ? handleEventPhotoLabel : undefined}
          onToggleFavorite={isEditing ? handleEventPhotoFavorite : undefined}
        />

        {isEditing && showScheduleNextControls ? (
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
                <View ref={nextDueFieldRef} collapsable={false}>
                  <DateInputField
                    label="Next due date"
                    value={nextDueStr}
                    onChangeText={(v) => {
                      markDirty();
                      setNextDueStr(v);
                    }}
                    onFocus={() => measureAndScroll(nextDueFieldRef.current)}
                    onCalendarOpen={() => measureAndScroll(nextDueFieldRef.current)}
                  />
                </View>

                <Text style={sharedStyles.fieldLabel}>Notes</Text>
                <TextInput
                  ref={scheduleNotesInputRef}
                  value={scheduleNotes}
                  onChangeText={(v) => {
                    markDirty();
                    setScheduleNotes(v);
                  }}
                  style={[sharedStyles.input, sharedStyles.inputMultiline]}
                  multiline
                  placeholder="Reminders for the next service…"
                  {...keyboardDone.getTextInputProps({
                    onFocus: () => measureAndScroll(scheduleNotesInputRef.current),
                  })}
                />
              </>
            ) : null}
          </>
        ) : !isEditing && scheduleNotes.trim() ? (
          <View style={[sharedStyles.catalogSection, { marginTop: 16 }]}>
            <DetailDisplayRow label="Schedule notes" value={scheduleNotes} stacked />
          </View>
        ) : null}
      </ScrollView>
      {isEditing ? keyboardDone.accessory : null}

      <Modal
        visible={typePickerOpen && isEditing}
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
                {title.trim() || 'Service event'}
              </Text>
            </View>
            {existing ? (
              <PinGearMenuItem
                pinned={isPinned(state, 'event', existing.id)}
                onToggle={() => {
                  setMenuOpen(false);
                  onSave(togglePin(state, 'event', existing.id));
                }}
              />
            ) : null}
            <Pressable
              onPress={startLoadFile}
              accessibilityRole="button"
              accessibilityLabel="Load file"
              accessibilityHint="Attaches a document or photo to this service event."
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Load file
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

      <SharePhotoModeModal
        visible={shareOptionsOpen}
        title="Share service event"
        photoMode={sharePhotoMode}
        onChangePhotoMode={setSharePhotoMode}
        showPhotoMode={eventHasFavoritePhotos}
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runEventShare(sharePhotoMode, shareFormat)}
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
            <EventExportSheet snapshot={exportSnapshot} />
          </View>
        </View>
      ) : null}

      {sharingPng ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            backgroundColor: 'rgba(255,255,255,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="auto"
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
    </ReuseExistingPhotosProvider>
  );
}
