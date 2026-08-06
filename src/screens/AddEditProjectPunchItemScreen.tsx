import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, ProjectPhoto, ProjectPunchItem } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ReuseExistingPhotosProvider } from '../components/ReuseExistingPhotosProvider';
import { InteractionPhotoSection } from '../components/InteractionPhotoSection';
import { DetailDisplayRow } from '../components/DetailDisplayRow';
import { DateInputField } from '../components/DateInputField';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
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
  deletePunchItemCascade,
  photosForPunchItem,
  projectById,
  projectPunchItemById,
  propertyById,
} from '../storage';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { withReusePhotoMeta } from '../reuseExistingPhotos';
import { reorderItemsById, type PhotoReorderDirection } from '../photoReorder';

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

export function AddEditProjectPunchItemScreen(props: {
  state: AppState;
  projectId: string;
  punchItemId: string;
  startEditing?: boolean;
  onBack: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, projectId, punchItemId, startEditing = false, onBack, onSave } = props;
  const insets = useSafeAreaInsets();
  const project = projectById(state, projectId);
  const property = project ? propertyById(state, project.propertyId) : undefined;
  const existing = projectPunchItemById(state, punchItemId);

  const [isEditing, setIsEditing] = useState(startEditing);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [dueStr, setDueStr] = useState(() =>
    existing?.dueAtISO ? dateInputValue(existing.dueAtISO) : ''
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [done, setDone] = useState(existing?.done ?? false);
  const [itemPhotos, setItemPhotos] = useState<ProjectPhoto[]>(() =>
    existing ? photosForPunchItem(state, existing.id) : []
  );
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const notesInputRef = useRef<RNTextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardDone = useKeyboardDoneAccessory({
    id: 'projectPunchNotesDone',
    variant: 'overlay',
  });

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
    (input: RNTextInput | null) => {
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
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFieldIntoView]);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDueStr(existing.dueAtISO ? dateInputValue(existing.dueAtISO) : '');
    setNotes(existing.notes ?? '');
    setDone(existing.done);
    setItemPhotos(photosForPunchItem(state, existing.id));
  }, [existing?.id]);

  useEffect(() => {
    if (!existing || isEditing) return;
    setTitle(existing.title);
    setDueStr(existing.dueAtISO ? dateInputValue(existing.dueAtISO) : '');
    setNotes(existing.notes ?? '');
    setDone(existing.done);
    setItemPhotos(photosForPunchItem(state, existing.id));
  }, [
    existing?.id,
    existing?.title,
    existing?.dueAtISO,
    existing?.notes,
    existing?.done,
    existing?.photoIds,
    isEditing,
    state,
  ]);

  if (!project || !existing) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Punch item not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const item = existing;

  const savedDueStr = item.dueAtISO ? dateInputValue(item.dueAtISO) : '';
  const savedPhotoIds = photosForPunchItem(state, item.id)
    .map((p) => p.id)
    .join(',');
  const draftPhotoIds = itemPhotos.map((p) => p.id).join(',');
  const isDirty =
    title.trim() !== item.title ||
    dueStr.trim() !== savedDueStr ||
    notes.trim() !== (item.notes ?? '') ||
    done !== item.done ||
    draftPhotoIds !== savedPhotoIds ||
    itemPhotos.some((photo) => {
      const saved = state.projectPhotos.find((p) => p.id === photo.id);
      if (!saved) return true;
      return (
        (photo.caption ?? '') !== (saved.caption ?? '') ||
        (photo.notes ?? '') !== (saved.notes ?? '')
      );
    });

  function resetDraftFromExisting() {
    setTitle(item.title);
    setDueStr(item.dueAtISO ? dateInputValue(item.dueAtISO) : '');
    setNotes(item.notes ?? '');
    setDone(item.done);
    setItemPhotos(photosForPunchItem(state, item.id));
  }

  function startEditingMode() {
    resetDraftFromExisting();
    setIsEditing(true);
  }

  function cancelEditing() {
    resetDraftFromExisting();
    setIsEditing(false);
  }

  function confirmLeave(leave: () => void) {
    if (!isEditing || !isDirty) {
      leave();
      return;
    }
    Alert.alert('Unsaved changes', 'You have entered data that will be lost if you leave.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
      {
        text: 'Save',
        onPress: () => {
          if (saveItem()) leave();
        },
      },
    ]);
  }

  async function addItemPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    const newPhotos: ProjectPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return withReusePhotoMeta(sourceUri, {
          id: photoId,
          projectId,
          punchItemId: item.id,
          localUri,
          createdAtISO: nowISO(),
        });
      })
    );
    const nextPhotos = [...itemPhotos, ...newPhotos];
    setItemPhotos(nextPhotos);
    // View mode: persist immediately (edit mode keeps draft until Save).
    if (!isEditing) {
      const photoIds = nextPhotos.map((p) => p.id);
      const removedPhotoIds = new Set(
        photosForPunchItem(state, item.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = nextPhotos.map((p) => ({
        ...p,
        punchItemId: item.id,
        projectId,
      }));
      const keptPhotos = state.projectPhotos.filter(
        (p) => p.punchItemId !== item.id || !removedPhotoIds.has(p.id)
      );
      const brandNew = updatedPhotos.filter((p) => !state.projectPhotos.some((x) => x.id === p.id));
      const mergedPhotos = keptPhotos.map((p) => {
        if (p.punchItemId !== item.id) return p;
        return updatedPhotos.find((d) => d.id === p.id) ?? p;
      });
      onSave({
        ...state,
        projectPunchItems: state.projectPunchItems.map((t) =>
          t.id === item.id
            ? { ...t, photoIds, updatedAtISO: nowISO() }
            : t
        ),
        projectPhotos: [...mergedPhotos, ...brandNew],
      });
    }
    return newPhotos.map((photo) => photo.id);
  }

  function handleItemPhotoLabel(photoId: string, label: string, notesValue: string) {
    const trimmed = label.trim();
    const trimmedNotes = notesValue.trim();
    setItemPhotos((prev) =>
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

  async function removeItemPhoto(photoId: string) {
    const photo = itemPhotos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    setItemPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function reorderItemPhoto(photoId: string, direction: PhotoReorderDirection) {
    setItemPhotos((prev) => reorderItemsById(prev, photoId, direction));
  }

  function saveItem(): boolean {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Enter a short title for this punch item.');
      return false;
    }

    const trimmedDue = dueStr.trim();
    let dueAtISO: string | undefined;
    if (trimmedDue) {
      dueAtISO = parseDateInputToISO(trimmedDue);
      if (!dueAtISO) {
        Alert.alert(
          'Invalid date',
          `Enter a due date as ${dateInputPlaceholder()}, or leave it blank.`
        );
        return false;
      }
    }

    const trimmedNotes = notes.trim();
    const photoIds = itemPhotos.map((p) => p.id);
    const stamp = nowISO();

    const updated: ProjectPunchItem = {
      ...item,
      title: trimmedTitle,
      dueAtISO,
      notes: trimmedNotes || undefined,
      done,
      completedAtISO: done ? item.completedAtISO ?? stamp : undefined,
      photoIds,
      updatedAtISO: stamp,
    };

    const removedPhotoIds = new Set(
      photosForPunchItem(state, item.id)
        .map((p) => p.id)
        .filter((id) => !photoIds.includes(id))
    );
    const updatedPhotos = itemPhotos.map((p) => ({
      ...p,
      punchItemId: item.id,
      projectId,
    }));
    const keptPhotos = state.projectPhotos.filter(
      (p) => p.punchItemId !== item.id || !removedPhotoIds.has(p.id)
    );
    const newPhotos = updatedPhotos.filter((p) => !state.projectPhotos.some((x) => x.id === p.id));
    const mergedPhotos = keptPhotos.map((p) => {
      if (p.punchItemId !== item.id) return p;
      return updatedPhotos.find((d) => d.id === p.id) ?? p;
    });

    onSave({
      ...state,
      projectPunchItems: state.projectPunchItems.map((t) => (t.id === item.id ? updated : t)),
      projectPhotos: [...mergedPhotos, ...newPhotos],
    });
    keyboardDone.dismiss();
    setIsEditing(false);
    return true;
  }

  function finishEditing() {
    saveItem();
  }

  function confirmDelete() {
    Alert.alert('Delete punch item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            for (const photo of itemPhotos) {
              await deletePhotoFile(photo.localUri);
            }
            onSave(deletePunchItemCascade(state, item.id));
            onBack();
          })();
        },
      },
    ]);
  }

  const headerLabel = isEditing && isDirty ? '← Cancel' : '← Back';
  const subtitle = [project.name, property?.name].filter(Boolean).join(' · ');
  const reusePropertyId = property?.id ?? project.propertyId;

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={reusePropertyId}>
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader
        onPress={() => (isEditing && isDirty ? confirmLeave(onBack) : isEditing ? cancelEditing() : onBack())}
        label={headerLabel}
      >
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Pressable
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete punch item"
            hitSlop={8}
            style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="delete" size={22} color={colors.danger} />
          </Pressable>
          {isEditing ? (
            <Pressable
              onPress={finishEditing}
              accessibilityRole="button"
              accessibilityLabel="Save punch item"
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
              onPress={startEditingMode}
              accessibilityRole="button"
              accessibilityLabel="Edit punch item"
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
          {
            paddingTop: 0,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <InteractionPhotoSection
          photos={itemPhotos}
          onAddPhotos={addItemPhotos}
          onDeletePhoto={
            isEditing
              ? (photoId) => {
                  void removeItemPhoto(photoId);
                }
              : undefined
          }
          onReorderPhoto={isEditing ? reorderItemPhoto : undefined}
          onLabelPhoto={isEditing ? handleItemPhotoLabel : undefined}
          hint={isEditing ? 'Attach photos related to this punch item.' : undefined}
        >
          <Text style={sharedStyles.title}>
            {isEditing ? title.trim() || item.title : item.title}
          </Text>
          <Text style={sharedStyles.subtitle}>{subtitle}</Text>
        </InteractionPhotoSection>

        {isEditing ? (
          <>
            <Text style={sharedStyles.fieldLabel}>Title</Text>
            <TextInput
              style={sharedStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What still needs fixing"
              placeholderTextColor={colors.textMuted}
              {...keyboardDone.textInputProps}
            />

            <DateInputField label="Due date" value={dueStr} onChangeText={setDueStr} optional />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 4,
                marginBottom: 4,
              }}
            >
              <Text style={[sharedStyles.fieldLabel, { marginBottom: 0 }]}>Done</Text>
              <Switch value={done} onValueChange={setDone} />
            </View>

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              ref={notesInputRef}
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Details, location, or follow-up notes"
              placeholderTextColor={colors.textMuted}
              multiline
              {...keyboardDone.getTextInputProps({
                onFocus: () => measureAndScroll(notesInputRef.current),
              })}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 12 }]}>
            <DetailDisplayRow label="Title" value={item.title} />
            <DetailDisplayRow
              label="Due date"
              value={item.dueAtISO ? formatDisplayDate(item.dueAtISO) : undefined}
            />
            <DetailDisplayRow label="Done" value={item.done ? 'Yes' : 'No'} />
            <DetailDisplayRow label="Notes" value={item.notes} stacked />
          </View>
        )}
      </ScrollView>
      {isEditing ? keyboardDone.accessory : null}
    </KeyboardAvoidingView>
    </ReuseExistingPhotosProvider>
  );
}
