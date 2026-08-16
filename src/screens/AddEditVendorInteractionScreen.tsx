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
import type { ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, VendorContactMethod, VendorInteraction, VendorPhoto } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import { InteractionPhotoSection } from '../components/InteractionPhotoSection';
import { InteractionExportSheet } from '../components/InteractionExportSheet';
import { DetailDisplayRow, DETAIL_LABEL_COLUMN_WIDTH } from '../components/DetailDisplayRow';
import { DateInputField } from '../components/DateInputField';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { InteractionDateText } from '../components/ListRows';
import { sharedStyles, colors } from '../theme';
import {
  dateInputPlaceholder,
  dateInputValue,
  formatDisplayDate,
  nowISO,
  parseDateInputToISO,
  uid,
} from '../utils';
import {
  deleteVendorInteractionCascade,
  photosForVendorInteraction,
  projectById,
  projectsForProperty,
  propertyById,
  propertyIdForInteraction,
  vendorById,
  vendorInteractionById,
  vendorsForProject,
} from '../storage';
import { isAfterToday } from '../eventRecurrence';
import {
  VENDOR_CONTACT_METHOD_OPTIONS,
  vendorContactMethodLabel,
} from '../vendorContactMethod';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { withReusePhotoMeta } from '../reuseExistingPhotos';
import { reorderItemsById, type PhotoReorderDirection } from '../photoReorder';
import { setVendorPhotoCaptionAndNotes } from '../photoMeta';
import { firstPhotoUriForProject } from '../projectPhotos';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import {
  buildInteractionExportSnapshot,
  interactionSnapshotToPlainText,
  type InteractionExportSnapshot,
} from '../interactionExportContent';
import { DEFAULT_SHARE_FORMAT, type ShareFormat } from '../shareFormat';
import { shareViewAsPng } from '../shareViewImage';
import { shareHtmlAsPdf } from '../shareViewPdf';
import { copyPlainTextToClipboard } from '../sharePlainText';
import { buildExportPdfHtml, interactionSnapshotToPdfDoc } from '../exportPdfHtml';
import { ShareFormatModal } from '../components/ShareFormatModal';
import { PinGearMenuItem } from '../components/PinGearMenuItem';
import { isPinned, togglePin } from '../pins';
import {
  ToolbarNewSearchControls,
  usePropertyGearNav,
} from '../components/PropertyGearNavItems';
import type { InteractionSearchMatchField } from '../searchSnippet';

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

/** Overlay Done dismiss bar sits above the keyboard. */
const DONE_BAR_HEIGHT = 56;

export function AddEditVendorInteractionScreen(props: {
  state: AppState;
  vendorId?: string;
  propertyId?: string;
  /** When creating from a project, pre-select this project in the link pickers. */
  projectId?: string;
  interactionId?: string;
  /** From Interactions search open: highlight match in view mode. */
  searchQuery?: string;
  searchMatchField?: InteractionSearchMatchField;
  onBack: () => void;
  onGoToProperty: () => void;
  /** After creating a new interaction, parent should pin the new id in the route. */
  onCreated: (
    interactionId: string,
    meta: { vendorId?: string; propertyId?: string }
  ) => void;
  onSave: (state: AppState) => void | Promise<void>;
  onAddInteraction?: () => void;
  onAddServiceEvent?: () => void;
  onSearchAssets?: () => void;
  onSearchInteractions?: () => void;
  onSearchServiceHistory?: () => void;
  onSearchActivity?: () => void;
  onOpenProject?: (projectId: string) => void;
  onOpenVendor?: (vendorId: string) => void;
  onOpenItem?: (itemId: string, startEditingSection?: 'appliance' | 'purchase' | 'repair') => void;
}) {
  const {
    state,
    vendorId,
    propertyId,
    projectId: initialProjectId,
    interactionId,
    searchQuery,
    searchMatchField,
    onBack,
    onGoToProperty,
    onCreated,
    onSave,
    onAddInteraction,
    onAddServiceEvent,
    onSearchAssets,
    onSearchInteractions,
    onSearchServiceHistory,
    onSearchActivity,
    onOpenProject,
    onOpenVendor,
    onOpenItem,
  } = props;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const focusedInputRef = useRef<RNTextInput | null>(null);
  const contactInputRef = useRef<RNTextInput>(null);
  const notesInputRef = useRef<RNTextInput>(null);
  const exportRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const existing = interactionId ? vendorInteractionById(state, interactionId) : undefined;
  const textScaleControls = useTextScaleControls();

  const scrollFieldIntoView = useCallback(
    (windowY: number, height: number, kbHeight: number) => {
      const visibleBottom =
        Dimensions.get('window').height - kbHeight - DONE_BAR_HEIGHT - Math.max(insets.bottom, 8) - 16;
      const fieldBottom = windowY + height;
      if (fieldBottom > visibleBottom) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollYRef.current + (fieldBottom - visibleBottom)),
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
    (input: RNTextInput | null) => {
      focusedInputRef.current = input;
      requestAnimationFrame(() => {
        input?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
          handleFieldFocus(y, height);
        });
      });
    },
    [handleFieldFocus]
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
        focusedInputRef.current = null;
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFieldIntoView]);

  // After keyboardHeight updates content padding, re-measure and scroll. Short
  // forms (no photos) cannot scroll on the first keyboard-show pass because
  // padding has not grown yet — this second pass keeps Notes / Contact visible.
  useEffect(() => {
    if (keyboardHeight <= 0 || !pendingFocusRef.current) return;
    const input = focusedInputRef.current;
    if (!input) return;
    const frame = requestAnimationFrame(() => {
      input.measureInWindow((_x: number, y: number, _w: number, height: number) => {
        pendingFocusRef.current = { y, height };
        scrollFieldIntoView(y, height, keyboardHeight);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight, scrollFieldIntoView]);
  /** Project/Vendor pickers when a property is known; hide for vendor-detail “new” (locked vendor). */
  const lockedToVendorCreate = !existing && Boolean(vendorId) && !propertyId;

  const initialVendorId = vendorId ?? existing?.vendorId;
  const initialVendor = initialVendorId ? vendorById(state, initialVendorId) : undefined;

  const [draftVendorId, setDraftVendorId] = useState<string | undefined>(initialVendorId);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(() => {
    if (existing?.projectId) return existing.projectId;
    return initialVendor?.projectId ?? initialProjectId ?? null;
  });

  const draftVendor = draftVendorId ? vendorById(state, draftVendorId) : undefined;
  const resolvedPropertyId =
    propertyId ??
    existing?.propertyId ??
    (draftVendor
      ? projectById(state, draftVendor.projectId)?.propertyId
      : undefined) ??
    (existing?.projectId
      ? projectById(state, existing.projectId)?.propertyId
      : undefined) ??
    (existing ? propertyIdForInteraction(state, existing) : undefined) ??
    (initialProjectId ? projectById(state, initialProjectId)?.propertyId : undefined);
  const showLinkPickers = Boolean(resolvedPropertyId) && !lockedToVendorCreate;
  const property = resolvedPropertyId ? propertyById(state, resolvedPropertyId) : undefined;
  const gearPropertyId = resolvedPropertyId ?? '';
  const showPropertyGearNav = Boolean(gearPropertyId);

  const projects = useMemo(
    () => (resolvedPropertyId ? projectsForProperty(state, resolvedPropertyId) : []),
    [resolvedPropertyId, state]
  );
  const vendorsForPicker = useMemo(() => {
    if (!draftProjectId) return [];
    return vendorsForProject(state, draftProjectId);
  }, [draftProjectId, state]);

  const [isEditing, setIsEditing] = useState(!existing);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateStr, setDateStr] = useState(() =>
    dateInputValue(existing?.occurredAtISO ?? nowISO())
  );
  const [contactMethod, setContactMethod] = useState<VendorContactMethod>(
    existing?.contactMethod ?? 'phone_call'
  );
  const [contactName, setContactName] = useState(
    existing?.contactName ?? initialVendor?.contactName ?? ''
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [important, setImportant] = useState(existing?.important === true);
  /** Draft photos while editing — persisted on Save (same pattern as eventPhotos). */
  const [interactionPhotos, setInteractionPhotos] = useState<VendorPhoto[]>(() =>
    existing ? photosForVendorInteraction(state, existing.id) : []
  );
  const [exportSnapshot, setExportSnapshot] = useState<InteractionExportSnapshot | null>(null);
  const [sharingPng, setSharingPng] = useState(false);
  const [shareOptionsOpen, setShareOptionsOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);

  const keyboardDone = useKeyboardDoneAccessory({
    id: 'vendorInteractionNotesDone',
    variant: 'overlay',
  });

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  const noop = () => {};
  const {
    newItems: propertyNewItems,
    searchItems: propertySearchItems,
    createModals: propertyGearCreateModals,
  } = usePropertyGearNav({
    state,
    propertyId: gearPropertyId,
    runMenuAction,
    actions: {
      onAddInteraction: onAddInteraction ?? noop,
      onAddServiceEvent: onAddServiceEvent ?? noop,
      onSearchAssets: onSearchAssets ?? noop,
      onSearchInteractions: onSearchInteractions ?? noop,
      onSearchServiceHistory: onSearchServiceHistory ?? noop,
      onSearchActivity,
      onOpenProject: onOpenProject ?? noop,
      onOpenItem: onOpenItem ?? noop,
      onSave: (next) => {
        void onSave(next);
      },
    },
  });

  const partyLabel =
    draftVendor?.name?.trim() ||
    contactName.trim() ||
    property?.name?.trim() ||
    'No vendor';

  const openShareOptions = useCallback(() => {
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert(
        'Share failed',
        `Enter a valid date (${dateInputPlaceholder()}) before sharing.`
      );
      return;
    }
    setShareFormat(DEFAULT_SHARE_FORMAT);
    setShareOptionsOpen(true);
  }, [dateStr]);

  const runInteractionShare = useCallback(
    async (format: ShareFormat = DEFAULT_SHARE_FORMAT) => {
      const occurredAtISO = parseDateInputToISO(dateStr);
      if (!occurredAtISO) {
        Alert.alert(
          'Share failed',
          `Enter a valid date (${dateInputPlaceholder()}) before sharing.`
        );
        return;
      }
      const snapshot = buildInteractionExportSnapshot({
        state,
        vendorId: draftVendorId,
        propertyId: resolvedPropertyId,
        projectId: draftProjectId ?? undefined,
        occurredAtISO,
        contactMethod,
        contactName: contactName.trim() || undefined,
        notes: notes.trim() || undefined,
        important,
        photos: interactionPhotos,
      });
      if (!snapshot) {
        Alert.alert('Share failed', 'Could not build interaction summary.');
        return;
      }
      setShareOptionsOpen(false);
      setMenuOpen(false);
      if (format === 'text') {
        await copyPlainTextToClipboard(interactionSnapshotToPlainText(snapshot));
        return;
      }
      if (format === 'pdf') {
        setSharingPng(true);
        try {
          const html = await buildExportPdfHtml(interactionSnapshotToPdfDoc(snapshot));
          await shareHtmlAsPdf(html, `Share ${snapshot.title}`);
        } finally {
          setSharingPng(false);
        }
        return;
      }
      setSharingPng(true);
      const photosWithAspect = await Promise.all(
        snapshot.photos.map(
          (photo) =>
            new Promise<(typeof snapshot.photos)[number]>((resolve) => {
              Image.getSize(
                photo.uri,
                (width, height) => {
                  resolve({
                    ...photo,
                    aspectRatio: width > 0 && height > 0 ? width / height : 1,
                  });
                },
                () => resolve({ ...photo, aspectRatio: 1 })
              );
            })
        )
      );
      setExportSnapshot({ ...snapshot, photos: photosWithAspect });
    },
    [
      contactMethod,
      contactName,
      dateStr,
      draftProjectId,
      draftVendorId,
      important,
      interactionPhotos,
      notes,
      resolvedPropertyId,
      state,
    ]
  );

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

  if (interactionId && !existing) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Interaction not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!existing && !draftVendor && !property) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>
          {vendorId ? 'Vendor not found.' : 'Property not found.'}
        </Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  function openMethodPicker() {
    Alert.alert(
      'How contacted',
      undefined,
      [
        ...VENDOR_CONTACT_METHOD_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => setContactMethod(opt.id),
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function openProjectPicker() {
    Alert.alert(
      'Project',
      undefined,
      [
        {
          text: 'None',
          onPress: () => {
            setDraftProjectId(null);
            setDraftVendorId(undefined);
          },
        },
        ...projects.map((project) => ({
          text: project.name,
          onPress: () => {
            setDraftProjectId(project.id);
            if (draftVendor && draftVendor.projectId !== project.id) {
              setDraftVendorId(undefined);
            }
          },
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function openVendorPicker() {
    if (!draftProjectId) {
      Alert.alert('Select a project', 'Choose a project before selecting a vendor.');
      return;
    }
    Alert.alert(
      'Vendor',
      undefined,
      [
        {
          text: 'None',
          onPress: () => setDraftVendorId(undefined),
        },
        ...vendorsForPicker.map((vendor) => ({
          text: vendor.name,
          onPress: () => {
            setDraftVendorId(vendor.id);
            setDraftProjectId(vendor.projectId);
            setContactName((prev) => prev.trim() || vendor.contactName?.trim() || '');
          },
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  function resetDraftFromExisting() {
    if (!existing) return;
    setDateStr(dateInputValue(existing.occurredAtISO));
    setContactMethod(existing.contactMethod);
    const existingVendor = existing.vendorId
      ? vendorById(state, existing.vendorId)
      : undefined;
    setDraftVendorId(existing.vendorId);
    setDraftProjectId(
      existing.projectId ?? existingVendor?.projectId ?? null
    );
    setContactName(existing.contactName ?? existingVendor?.contactName ?? '');
    setNotes(existing.notes ?? '');
    setImportant(existing.important === true);
    setInteractionPhotos(photosForVendorInteraction(state, existing.id));
  }

  function cancelEditing() {
    if (existing) {
      resetDraftFromExisting();
      setIsEditing(false);
      return;
    }
    onBack();
  }

  async function addInteractionPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    const newPhotos: VendorPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return withReusePhotoMeta(sourceUri, {
          id: photoId,
          ...(draftVendorId ? { vendorId: draftVendorId } : {}),
          interactionId: existing?.id,
          localUri,
          createdAtISO: nowISO(),
        });
      })
    );
    const nextPhotos = [...interactionPhotos, ...newPhotos];
    setInteractionPhotos(nextPhotos);
    // View mode on an existing interaction: persist immediately (like photo labels).
    if (!isEditing && existing) {
      const photoIds = nextPhotos.map((p) => p.id);
      const photoVendorPatch = (photo: VendorPhoto): VendorPhoto =>
        draftVendorId
          ? { ...photo, vendorId: draftVendorId }
          : { ...photo, vendorId: undefined };
      const removedPhotoIds = new Set(
        photosForVendorInteraction(state, existing.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = nextPhotos.map((p) =>
        photoVendorPatch({
          ...p,
          interactionId: existing.id,
        })
      );
      const keptPhotos = state.vendorPhotos.filter(
        (p) => p.interactionId !== existing.id || !removedPhotoIds.has(p.id)
      );
      const brandNew = updatedPhotos.filter((p) => !state.vendorPhotos.some((x) => x.id === p.id));
      const mergedPhotos = keptPhotos.map((p) => {
        if (p.interactionId !== existing.id) return p;
        return updatedPhotos.find((d) => d.id === p.id) ?? p;
      });
      void Promise.resolve(
        onSave({
          ...state,
          vendorInteractions: state.vendorInteractions.map((i) =>
            i.id === existing.id
              ? { ...i, photoIds, updatedAtISO: nowISO() }
              : i
          ),
          vendorPhotos: [...mergedPhotos, ...brandNew],
        })
      );
    }
    return newPhotos.map((photo) => photo.id);
  }

  function handleInteractionPhotoLabel(photoId: string, label: string, notesValue: string) {
    const trimmed = label.trim();
    const trimmedNotes = notesValue.trim();
    setInteractionPhotos((prev) =>
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
    // View mode: persist immediately (same as vendor gallery). Edit mode: draft until Save.
    if (!isEditing && state.vendorPhotos.some((photo) => photo.id === photoId)) {
      void Promise.resolve(
        onSave(setVendorPhotoCaptionAndNotes(state, photoId, trimmed, trimmedNotes))
      );
    }
  }

  async function removeInteractionPhoto(photoId: string) {
    const photo = interactionPhotos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    const nextPhotos = interactionPhotos.filter((p) => p.id !== photoId);
    setInteractionPhotos(nextPhotos);
    // View mode on an existing interaction: persist immediately (like add / labels).
    if (!isEditing && existing) {
      void Promise.resolve(
        onSave({
          ...state,
          vendorInteractions: state.vendorInteractions.map((i) =>
            i.id === existing.id
              ? {
                  ...i,
                  photoIds: i.photoIds.filter((id) => id !== photoId),
                  updatedAtISO: nowISO(),
                }
              : i
          ),
          vendorPhotos: state.vendorPhotos.filter((p) => p.id !== photoId),
        })
      );
    }
  }

  function reorderInteractionPhoto(photoId: string, direction: PhotoReorderDirection) {
    setInteractionPhotos((prev) => reorderItemsById(prev, photoId, direction));
  }

  async function saveInteraction() {
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert('Invalid date', `Enter a date as ${dateInputPlaceholder()}.`);
      return;
    }
    const trimmedContact = contactName.trim();
    if (!draftVendorId && !trimmedContact) {
      Alert.alert(
        'Contact name required',
        'Enter who you spoke with (for example a neighbor’s name).',
        [
          {
            text: 'OK',
            onPress: () => {
              scrollRef.current?.scrollTo({ y: 0, animated: true });
              setTimeout(() => contactInputRef.current?.focus(), 100);
            },
          },
        ]
      );
      return;
    }
    if (!draftVendorId && !resolvedPropertyId) {
      Alert.alert('Property required', 'This interaction needs a property.');
      return;
    }
    const trimmedNotes = notes.trim();
    const photoIds = interactionPhotos.map((p) => p.id);
    const photoVendorPatch = (photo: VendorPhoto): VendorPhoto =>
      draftVendorId
        ? { ...photo, vendorId: draftVendorId }
        : { ...photo, vendorId: undefined };

    if (existing) {
      // Mirror AddEditEventScreen event-photo merge on edit.
      const removedPhotoIds = new Set(
        photosForVendorInteraction(state, existing.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = interactionPhotos.map((p) =>
        photoVendorPatch({
          ...p,
          interactionId: existing.id,
        })
      );
      const keptPhotos = state.vendorPhotos.filter(
        (p) => p.interactionId !== existing.id || !removedPhotoIds.has(p.id)
      );
      const newPhotos = updatedPhotos.filter((p) => !state.vendorPhotos.some((x) => x.id === p.id));
      // Prefer draft captions/notes for photos that already existed (draft is source of truth).
      const mergedPhotos = keptPhotos.map((p) => {
        if (p.interactionId !== existing.id) return p;
        return updatedPhotos.find((d) => d.id === p.id) ?? p;
      });

      const updated: VendorInteraction = {
        ...existing,
        vendorId: draftVendorId,
        projectId: draftProjectId ?? undefined,
        propertyId: resolvedPropertyId,
        contactMethod,
        contactName: trimmedContact || undefined,
        occurredAtISO,
        notes: trimmedNotes || undefined,
        important: important || undefined,
        photoIds,
        updatedAtISO: nowISO(),
      };
      await Promise.resolve(
        onSave({
          ...state,
          vendorInteractions: state.vendorInteractions.map((i) =>
            i.id === existing.id ? updated : i
          ),
          vendorPhotos: [...mergedPhotos, ...newPhotos],
        })
      );
      setIsEditing(false);
    } else {
      // Mirror AddEditEventScreen create path.
      const newInteractionId = uid('interaction');
      const photoRecords = interactionPhotos.map((p) =>
        photoVendorPatch({
          ...p,
          interactionId: newInteractionId,
        })
      );
      const interaction: VendorInteraction = {
        id: newInteractionId,
        vendorId: draftVendorId,
        projectId: draftProjectId ?? undefined,
        propertyId: resolvedPropertyId,
        contactMethod,
        contactName: trimmedContact || undefined,
        occurredAtISO,
        notes: trimmedNotes || undefined,
        important: important || undefined,
        photoIds,
        createdAtISO: nowISO(),
        updatedAtISO: nowISO(),
      };
      await Promise.resolve(
        onSave({
          ...state,
          vendorInteractions: [...state.vendorInteractions, interaction],
          vendorPhotos: [...state.vendorPhotos, ...photoRecords],
        })
      );
      // Pin id in the route after state is saved; remount opens read-only.
      onCreated(newInteractionId, {
        vendorId: draftVendorId,
        propertyId: resolvedPropertyId,
      });
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete interaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            for (const photo of interactionPhotos) {
              await deletePhotoFile(photo.localUri);
            }
            onSave(deleteVendorInteractionCascade(state, existing.id));
            onBack();
          })();
        },
      },
    ]);
  }

  const occurredAtISO = parseDateInputToISO(dateStr);
  const title = !existing ? 'New interaction' : isEditing ? 'Edit interaction' : 'Interaction';
  const project =
    draftProjectId != null ? projects.find((p) => p.id === draftProjectId) : undefined;
  const projectLabel = draftProjectId == null ? 'None' : (project?.name ?? 'None');
  const vendorLabel = draftVendor?.name?.trim() || 'None';
  const viewHighlightQuery =
    !isEditing && searchQuery?.trim() ? searchQuery.trim() : undefined;
  const highlightFor = (field: InteractionSearchMatchField) =>
    viewHighlightQuery && searchMatchField === field ? viewHighlightQuery : undefined;

  const projectContextUri =
    !isEditing && project ? firstPhotoUriForProject(state, project) : undefined;
  const vendorContextUri =
    !isEditing && draftVendor ? firstPhotoUriForVendor(state, draftVendor) : undefined;
  type ContextPhoto = {
    id: string;
    uri: string;
    label: string;
    onOpen?: () => void;
    accessibilityHint?: string;
  };
  const contextPhotos: ContextPhoto[] = [];
  if (projectContextUri && project) {
    contextPhotos.push({
      id: 'context-project',
      uri: projectContextUri,
      label: project.name?.trim() || 'Project',
      onOpen: onOpenProject ? () => onOpenProject(project.id) : undefined,
      accessibilityHint: 'Opens this project',
    });
  }
  if (vendorContextUri && draftVendor) {
    contextPhotos.push({
      id: 'context-vendor',
      uri: vendorContextUri,
      label: draftVendor.name?.trim() || 'Vendor',
      onOpen: onOpenVendor ? () => onOpenVendor(draftVendor.id) : undefined,
      accessibilityHint: 'Opens this vendor',
    });
  }
  const showContextPhotos = !isEditing && contextPhotos.length > 0;

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={resolvedPropertyId ?? ''}>
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader onPress={isEditing ? cancelEditing : onBack} label={isEditing ? '← Cancel' : '← Back'}>
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
            accessibilityRole="button"
            accessibilityLabel="Go to property"
            accessibilityHint="Opens the property page for this interaction."
            hitSlop={8}
            style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="home" size={22} color={colors.primary} />
          </Pressable>
          {existing ? (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete interaction"
              hitSlop={8}
              style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="delete" size={22} color={colors.danger} />
            </Pressable>
          ) : (
            <View style={{ width: 42, height: 36 }} />
          )}
          {gearPropertyId ? (
            <ToolbarNewSearchControls
              title={partyLabel}
              newItems={propertyNewItems}
              searchItems={propertySearchItems}
              disabled={sharingPng}
            />
          ) : null}
          {isEditing ? (
            <Pressable
              onPress={() => void saveInteraction()}
              accessibilityRole="button"
              accessibilityLabel="Save interaction"
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
              onPress={() => setIsEditing(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit interaction"
              accessibilityHint="Switches to edit mode."
              hitSlop={8}
              style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="edit" size={22} color={colors.editIcon} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setMenuOpen(true)}
            disabled={sharingPng}
            accessibilityRole="button"
            accessibilityLabel="Interaction options"
            accessibilityHint="Opens actions like text size, share, and delete."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: sharingPng ? 0.5 : pressed ? 0.7 : 1,
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
          {
            paddingTop: 0,
            // Grow with keyboard + Done bar so short (no-photo) forms can scroll
            // the focused field above both.
            paddingBottom:
              keyboardHeight > 0 ? keyboardHeight + DONE_BAR_HEIGHT + 24 : 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <Text style={sharedStyles.title}>{title}</Text>
        {isEditing ? <Text style={sharedStyles.subtitle}>{partyLabel}</Text> : null}

        {showContextPhotos ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            {contextPhotos.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={photo.onOpen}
                disabled={!photo.onOpen}
                accessibilityRole={photo.onOpen ? 'button' : 'image'}
                accessibilityLabel={photo.label}
                accessibilityHint={photo.onOpen ? photo.accessibilityHint : undefined}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: photo.onOpen && pressed ? 0.85 : 1,
                })}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: '100%',
                    aspectRatio: 4 / 3,
                    borderRadius: 10,
                    backgroundColor: colors.photoPlaceholder,
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={[
                    sharedStyles.cardMeta,
                    {
                      marginTop: 4,
                      textAlign: 'center',
                      fontWeight: '600',
                      ...(photo.onOpen ? { color: colors.primary } : null),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {photo.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isEditing ? (
          <>
            {showLinkPickers ? (
              <>
                <Text style={sharedStyles.fieldLabel}>Project</Text>
                <Pressable
                  onPress={openProjectPicker}
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
                  accessibilityHint="Opens a list of projects"
                >
                  <Text style={{ fontSize: 16, color: colors.text }}>{projectLabel}</Text>
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
                </Pressable>

                <Text style={sharedStyles.fieldLabel}>Vendor</Text>
                <Pressable
                  onPress={openVendorPicker}
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
                  accessibilityHint="Opens a list of vendors for the selected project"
                >
                  <Text style={{ fontSize: 16, color: colors.text }}>{vendorLabel}</Text>
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
                </Pressable>
              </>
            ) : null}

            <Text style={sharedStyles.fieldLabel}>
              {draftVendorId ? 'Contact person' : 'Contact name (required)'}
            </Text>
            <TextInput
              ref={contactInputRef}
              style={sharedStyles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder={
                draftVendorId ? 'Person you spoke with' : 'Neighbor or contact name'
              }
              placeholderTextColor={colors.textMuted}
              autoFocus={!existing && !draftVendorId}
              {...keyboardDone.getTextInputProps({
                onFocus: () => measureAndScroll(contactInputRef.current),
              })}
            />

            <DateInputField label="Date" value={dateStr} onChangeText={setDateStr} />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 4,
                marginBottom: 4,
              }}
            >
              <Text style={[sharedStyles.fieldLabel, { marginBottom: 0 }]}>Important</Text>
              <Switch value={important} onValueChange={setImportant} />
            </View>

            <Text style={sharedStyles.fieldLabel}>How contacted</Text>
            <Pressable
              onPress={openMethodPicker}
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
              accessibilityHint="Opens a list of contact methods"
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                {vendorContactMethodLabel(contactMethod)}
              </Text>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
            </Pressable>

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              ref={notesInputRef}
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes from the conversation"
              placeholderTextColor={colors.textMuted}
              multiline
              {...keyboardDone.getTextInputProps({
                onFocus: () => measureAndScroll(notesInputRef.current),
              })}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 12 }]}>
            {showLinkPickers && projectLabel !== 'None' ? (
              <DetailDisplayRow
                label="Project"
                value={projectLabel}
                highlightQuery={highlightFor('project')}
              />
            ) : null}
            {showLinkPickers && vendorLabel !== 'None' ? (
              <DetailDisplayRow
                label="Vendor"
                value={vendorLabel}
                highlightQuery={highlightFor('vendor')}
              />
            ) : null}
            {occurredAtISO && isAfterToday(occurredAtISO) ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                  gap: 12,
                }}
              >
                <Text
                  style={[
                    sharedStyles.fieldLabel,
                    {
                      marginTop: 0,
                      marginBottom: 0,
                      width: DETAIL_LABEL_COLUMN_WIDTH,
                      flexShrink: 0,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Date
                </Text>
                <InteractionDateText
                  iso={occurredAtISO}
                  style={[sharedStyles.cardMeta, { fontSize: 15, marginTop: 0, lineHeight: 22 }]}
                  restStyle={{ fontWeight: '400', color: colors.textMuted }}
                  stackRelative
                />
              </View>
            ) : (
              <DetailDisplayRow
                label="Date"
                value={occurredAtISO ? formatDisplayDate(occurredAtISO) : dateStr}
                highlightQuery={highlightFor('date')}
              />
            )}
            {important ? <DetailDisplayRow label="Important" value="Yes" /> : null}
            <DetailDisplayRow
              label="How contacted"
              value={vendorContactMethodLabel(contactMethod)}
              highlightQuery={highlightFor('method')}
            />
            <DetailDisplayRow
              label={draftVendorId ? 'Contact person' : 'Contact name'}
              value={contactName}
              highlightQuery={highlightFor('contactName')}
            />
            <DetailDisplayRow
              label="Notes"
              value={notes}
              stacked
              highlightQuery={highlightFor('notes')}
            />
          </View>
        )}

        <InteractionPhotoSection
          photos={interactionPhotos}
          onAddPhotos={addInteractionPhotos}
          onDeletePhoto={(photoId) => {
            void removeInteractionPhoto(photoId);
          }}
          onReorderPhoto={isEditing ? reorderInteractionPhoto : undefined}
          onLabelPhoto={handleInteractionPhotoLabel}
        />
      </ScrollView>
      {isEditing ? keyboardDone.accessory : null}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 24,
          }}
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
                {partyLabel}
              </Text>
            </View>
            {existing ? (
              <PinGearMenuItem
                pinned={isPinned(state, 'interaction', existing.id)}
                onToggle={() => {
                  setMenuOpen(false);
                  onSave(togglePin(state, 'interaction', existing.id));
                }}
              />
            ) : null}
            <Pressable
              onPress={() => runMenuAction(openShareOptions)}
              disabled={sharingPng}
              accessibilityRole="button"
              accessibilityLabel="Share interaction"
              accessibilityHint="Creates an image of this interaction and opens the share sheet."
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: sharingPng ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Share</Text>
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
            {existing ? (
              <Pressable
                onPress={() => runMenuAction(confirmDelete)}
                accessibilityRole="button"
                accessibilityLabel="Delete interaction"
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: colors.danger }}>
                  Delete interaction
                </Text>
              </Pressable>
            ) : null}
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

      {showPropertyGearNav ? propertyGearCreateModals : null}

      <ShareFormatModal
        visible={shareOptionsOpen}
        title="Share interaction"
        shareFormat={shareFormat}
        onChangeShareFormat={setShareFormat}
        onShare={() => void runInteractionShare(shareFormat)}
        onClose={() => setShareOptionsOpen(false)}
        formats={['png', 'pdf', 'text']}
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
            <InteractionExportSheet snapshot={exportSnapshot} />
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
