import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { Text, TextInput } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, PropertyPhoto, PropertyTodo } from '../types';
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
import { applyTodoDoneToggle } from '../eventRecurrence';
import {
  deletePropertyTodoCascade,
  photosForPropertyTodo,
  propertyById,
  propertyTodoById,
} from '../storage';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';
import { deleteDocumentFile } from '../documentStorage';
import { pickFileAttachment } from '../fileAttachment';
import { isPinned, togglePin } from '../pins';
import { PinGearMenuItem } from '../components/PinGearMenuItem';
import {
  addPropertyTodoExtraDocuments,
  propertyTodoExtraDocumentRows,
  removePropertyTodoExtraDocument,
} from '../propertyTodoExtraDocuments';
import { withReusePhotoMeta } from '../reuseExistingPhotos';
import { reorderItemsById, type PhotoReorderDirection } from '../photoReorder';

const REPEAT_MONTH_OPTIONS = [
  { months: 1, label: '1 Month' },
  { months: 3, label: '3 Month' },
  { months: 6, label: '6 Month' },
  { months: 12, label: '1 Year' },
] as const;

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

export function AddEditPropertyTodoScreen(props: {
  state: AppState;
  propertyId: string;
  todoId: string;
  startEditing?: boolean;
  kind?: 'todo' | 'idea';
  onBack: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, propertyId, todoId, startEditing = false, kind = 'todo', onBack, onSave } = props;
  const isIdea = kind === 'idea';
  const noun = isIdea ? 'idea' : 'to-do';
  const nounTitle = isIdea ? 'Idea' : 'To-do';
  const insets = useSafeAreaInsets();
  const property = propertyById(state, propertyId);
  const existing = propertyTodoById(state, todoId);

  const [isEditing, setIsEditing] = useState(startEditing);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [dueStr, setDueStr] = useState(() =>
    existing?.dueAtISO ? dateInputValue(existing.dueAtISO) : ''
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [done, setDone] = useState(existing?.done ?? false);
  const [repeatMonths, setRepeatMonths] = useState<number | undefined>(
    () => existing?.repeatMonths
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [todoPhotos, setTodoPhotos] = useState<PropertyPhoto[]>(() =>
    existing ? photosForPropertyTodo(state, existing.id) : []
  );
  const scrollRef = useRef<RNScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingFocusRef = useRef<{ y: number; height: number } | null>(null);
  const notesInputRef = useRef<RNTextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardDone = useKeyboardDoneAccessory({
    id: 'propertyTodoNotesDone',
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

  // Seed drafts when the to-do record becomes available (e.g. after Create → open).
  // startEditing can be true on first paint before `existing` exists in state.
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDueStr(existing.dueAtISO ? dateInputValue(existing.dueAtISO) : '');
    setNotes(existing.notes ?? '');
    setDone(existing.done);
    setRepeatMonths(existing.repeatMonths);
    setTodoPhotos(photosForPropertyTodo(state, existing.id));
  }, [existing?.id]);

  // Keep view-mode fields in sync with saved data while not editing.
  useEffect(() => {
    if (!existing || isEditing) return;
    setTitle(existing.title);
    setDueStr(existing.dueAtISO ? dateInputValue(existing.dueAtISO) : '');
    setNotes(existing.notes ?? '');
    setDone(existing.done);
    setRepeatMonths(existing.repeatMonths);
    setTodoPhotos(photosForPropertyTodo(state, existing.id));
  }, [
    existing?.id,
    existing?.title,
    existing?.dueAtISO,
    existing?.notes,
    existing?.done,
    existing?.repeatMonths,
    existing?.photoIds,
    isEditing,
    state,
  ]);

  if (!property || !existing) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>{nounTitle} not found.</Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const todo = existing;

  const savedDueStr = todo.dueAtISO ? dateInputValue(todo.dueAtISO) : '';
  const savedPhotoIds = photosForPropertyTodo(state, todo.id)
    .map((p) => p.id)
    .join(',');
  const draftPhotoIds = todoPhotos.map((p) => p.id).join(',');
  const isDirty =
    title.trim() !== todo.title ||
    dueStr.trim() !== savedDueStr ||
    notes.trim() !== (todo.notes ?? '') ||
    done !== todo.done ||
    (repeatMonths ?? undefined) !== (todo.repeatMonths ?? undefined) ||
    draftPhotoIds !== savedPhotoIds ||
    todoPhotos.some((photo) => {
      const saved = state.propertyPhotos.find((p) => p.id === photo.id);
      if (!saved) return true;
      return (
        (photo.caption ?? '') !== (saved.caption ?? '') ||
        (photo.notes ?? '') !== (saved.notes ?? '')
      );
    });

  function resetDraftFromExisting() {
    setTitle(todo.title);
    setDueStr(todo.dueAtISO ? dateInputValue(todo.dueAtISO) : '');
    setNotes(todo.notes ?? '');
    setDone(todo.done);
    setRepeatMonths(todo.repeatMonths);
    setTodoPhotos(photosForPropertyTodo(state, todo.id));
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
          if (saveTodo()) leave();
        },
      },
    ]);
  }

  async function addTodoPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return [];
    const newPhotos: PropertyPhoto[] = await Promise.all(
      sourceUris.map(async (sourceUri) => {
        const photoId = uid('photo');
        const localUri = await persistPhotoFromUri(sourceUri, photoId);
        return withReusePhotoMeta(sourceUri, {
          id: photoId,
          propertyId,
          todoId: todo.id,
          localUri,
          createdAtISO: nowISO(),
        });
      })
    );
    const nextPhotos = [...todoPhotos, ...newPhotos];
    setTodoPhotos(nextPhotos);
    // View mode: persist immediately (edit mode keeps draft until Save).
    if (!isEditing) {
      const photoIds = nextPhotos.map((p) => p.id);
      const removedPhotoIds = new Set(
        photosForPropertyTodo(state, todo.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = nextPhotos.map((p) => ({
        ...p,
        todoId: todo.id,
      }));
      const keptPhotos = state.propertyPhotos.filter(
        (p) => p.todoId !== todo.id || !removedPhotoIds.has(p.id)
      );
      const brandNew = updatedPhotos.filter((p) => !state.propertyPhotos.some((x) => x.id === p.id));
      const mergedPhotos = keptPhotos.map((p) => {
        if (p.todoId !== todo.id) return p;
        return updatedPhotos.find((d) => d.id === p.id) ?? p;
      });
      onSave({
        ...state,
        propertyTodos: state.propertyTodos.map((t) =>
          t.id === todo.id ? { ...t, photoIds } : t
        ),
        propertyPhotos: [...mergedPhotos, ...brandNew],
      });
    }
    return newPhotos.map((photo) => photo.id);
  }

  function handleTodoPhotoLabel(photoId: string, label: string, notesValue: string) {
    const trimmed = label.trim();
    const trimmedNotes = notesValue.trim();
    setTodoPhotos((prev) =>
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

  async function removeTodoPhoto(photoId: string) {
    const photo = todoPhotos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    setTodoPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function reorderTodoPhoto(photoId: string, direction: PhotoReorderDirection) {
    setTodoPhotos((prev) => reorderItemsById(prev, photoId, direction));
  }

  function handleDoneChange(wantDone: boolean) {
    if (!wantDone) {
      setDone(false);
      setRepeatMonths(undefined);
      return;
    }
    setDone(true);
  }

  function saveTodo(): boolean {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', `Enter a short title for this ${noun}.`);
      return false;
    }

    const effectiveRepeat = isIdea ? undefined : repeatMonths;
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
    if (effectiveRepeat != null && effectiveRepeat >= 1 && !dueAtISO) {
      Alert.alert('Due date required', 'Set a due date when Repeat is enabled.');
      return false;
    }

    const trimmedNotes = notes.trim();
    const photoIds = todoPhotos.map((p) => p.id);

    const draftForDone: PropertyTodo = {
      ...todo,
      title: trimmedTitle,
      dueAtISO,
      repeatMonths: effectiveRepeat,
      notes: trimmedNotes || undefined,
      done,
      photoIds,
    };
    const afterDone = applyTodoDoneToggle(draftForDone, done, nowISO());

    const removedPhotoIds = new Set(
      photosForPropertyTodo(state, todo.id)
        .map((p) => p.id)
        .filter((id) => !photoIds.includes(id))
    );
    const updatedPhotos = todoPhotos.map((p) => ({
      ...p,
      todoId: todo.id,
    }));
    const keptPhotos = state.propertyPhotos.filter(
      (p) => p.todoId !== todo.id || !removedPhotoIds.has(p.id)
    );
    const newPhotos = updatedPhotos.filter((p) => !state.propertyPhotos.some((x) => x.id === p.id));
    const mergedPhotos = keptPhotos.map((p) => {
      if (p.todoId !== todo.id) return p;
      return updatedPhotos.find((d) => d.id === p.id) ?? p;
    });

    const updated: PropertyTodo = {
      ...afterDone,
      title: trimmedTitle,
      notes: trimmedNotes || undefined,
      repeatMonths: effectiveRepeat,
      photoIds,
    };
    // Sync local draft if roll-forward happened on save.
    if (updated.dueAtISO !== dueAtISO || updated.done !== done) {
      setDueStr(updated.dueAtISO ? dateInputValue(updated.dueAtISO) : '');
      setDone(updated.done);
    }

    onSave({
      ...state,
      propertyTodos: state.propertyTodos.map((t) => (t.id === todo.id ? updated : t)),
      propertyPhotos: [...mergedPhotos, ...newPhotos],
    });
    keyboardDone.dismiss();
    setIsEditing(false);
    return true;
  }

  function finishEditing() {
    saveTodo();
  }

  async function handleAddDocuments(
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) {
    onSave(await addPropertyTodoExtraDocuments(state, todo.id, picked));
  }

  function startLoadFile() {
    void pickFileAttachment()
      .then((picked) => {
        setMenuOpen(false);
        if (!picked) return;
        if (picked.kind === 'image') {
          void addTodoPhotos([picked.uri]);
          return;
        }
        void handleAddDocuments([picked]);
      })
      .catch(() => {
        setMenuOpen(false);
      });
  }

  function confirmDelete() {
    Alert.alert(`Delete ${noun}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            for (const photo of todoPhotos) {
              await deletePhotoFile(photo.localUri);
            }
            for (const documentId of todo.documentIds ?? []) {
              const doc = state.documents.find((d) => d.id === documentId);
              if (doc) await deleteDocumentFile(doc.localUri);
            }
            onSave(deletePropertyTodoCascade(state, todo.id));
            onBack();
          })();
        },
      },
    ]);
  }

  const headerLabel = isEditing && isDirty ? '← Cancel' : '← Back';

  return (
    <ReuseExistingPhotosProvider state={state} propertyId={propertyId}>
    <KeyboardAvoidingView
      style={[sharedStyles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScreenBackHeader onPress={() => confirmLeave(onBack)} label={headerLabel}>
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${nounTitle} options`}
            accessibilityHint="Opens actions like load file."
            hitSlop={8}
            style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="settings" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${noun}`}
            hitSlop={8}
            style={({ pressed }) => [headerIconBtn, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="delete" size={22} color={colors.danger} />
          </Pressable>
          {isEditing ? (
            <Pressable
              onPress={finishEditing}
              accessibilityRole="button"
              accessibilityLabel={`Save ${noun}`}
              accessibilityHint={`Saves ${noun} details and exits edit mode.`}
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
              accessibilityLabel={`Edit ${noun}`}
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
          photos={todoPhotos}
          onAddPhotos={addTodoPhotos}
          onAddDocuments={handleAddDocuments}
          extraDocumentRows={propertyTodoExtraDocumentRows(state, todo, (documentId) => {
            void removePropertyTodoExtraDocument(state, todo.id, documentId).then(onSave);
          })}
          onDeletePhoto={
            isEditing
              ? (photoId) => {
                  void removeTodoPhoto(photoId);
                }
              : undefined
          }
          onReorderPhoto={isEditing ? reorderTodoPhoto : undefined}
          onLabelPhoto={isEditing ? handleTodoPhotoLabel : undefined}
          hint={isEditing ? `Attach photos related to this ${noun}.` : undefined}
        >
          <Text style={sharedStyles.title}>{isEditing ? title.trim() || todo.title : todo.title}</Text>
          <Text style={sharedStyles.subtitle}>{property.name}</Text>
        </InteractionPhotoSection>

        {isEditing ? (
          <>
            <Text style={sharedStyles.fieldLabel}>Title</Text>
            <TextInput
              style={sharedStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={isIdea ? 'A rough idea for this property' : 'What needs to be done'}
              placeholderTextColor={colors.textMuted}
              {...keyboardDone.textInputProps}
            />

            <DateInputField
              label="Due date"
              value={dueStr}
              onChangeText={setDueStr}
              optional={!(repeatMonths != null && repeatMonths >= 1)}
            />

            {isIdea ? null : (
              <>
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
                  <Switch value={done} onValueChange={handleDoneChange} />
                </View>

                {done ? (
                  <>
                    <Text style={[sharedStyles.fieldLabel, { marginTop: 8 }]}>Repeat</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <Pressable
                        onPress={() => setRepeatMonths(undefined)}
                        accessibilityState={{ selected: repeatMonths == null }}
                        style={[
                          sharedStyles.secondaryBtn,
                          { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 },
                          repeatMonths == null && {
                            borderColor: colors.primary,
                            backgroundColor: colors.upcomingCardBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            sharedStyles.secondaryBtnText,
                            repeatMonths == null && { fontWeight: '700' },
                          ]}
                        >
                          Off
                        </Text>
                      </Pressable>
                      {REPEAT_MONTH_OPTIONS.map((opt) => {
                        const selected = repeatMonths === opt.months;
                        return (
                          <Pressable
                            key={opt.months}
                            onPress={() => setRepeatMonths(opt.months)}
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
                    {repeatMonths != null ? (
                      <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>
                        Saving advances the due date by this interval and keeps the to-do open.
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            )}

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              ref={notesInputRef}
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Details, location, or reminders"
              placeholderTextColor={colors.textMuted}
              multiline
              {...keyboardDone.getTextInputProps({
                onFocus: () => measureAndScroll(notesInputRef.current),
              })}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 12 }]}>
            <DetailDisplayRow label="Title" value={todo.title} />
            <DetailDisplayRow
              label="Due date"
              value={todo.dueAtISO ? formatDisplayDate(todo.dueAtISO) : undefined}
            />
            {isIdea ? null : (
              <>
                <DetailDisplayRow label="Done" value={todo.done ? 'Yes' : 'No'} />
                {todo.done || todo.repeatMonths != null ? (
                  <DetailDisplayRow
                    label="Repeat"
                    value={
                      todo.repeatMonths === 1
                        ? 'Every month'
                        : todo.repeatMonths === 3
                          ? 'Every 3 months'
                          : todo.repeatMonths === 6
                            ? 'Every 6 months'
                            : todo.repeatMonths === 12
                              ? 'Every year'
                              : todo.repeatMonths
                                ? `Every ${todo.repeatMonths} months`
                                : 'Off'
                    }
                  />
                ) : null}
              </>
            )}
            <DetailDisplayRow label="Notes" value={todo.notes} stacked />
          </View>
        )}
      </ScrollView>
      {isEditing ? keyboardDone.accessory : null}

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
                {todo.title}
              </Text>
            </View>
            <PinGearMenuItem
              pinned={isPinned(state, 'todo', todo.id)}
              onToggle={() => {
                setMenuOpen(false);
                onSave(togglePin(state, 'todo', todo.id));
              }}
            />
            <Pressable
              onPress={startLoadFile}
              accessibilityRole="button"
              accessibilityLabel="Load file"
              accessibilityHint={`Attaches a document or photo to this ${noun}.`}
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
    </KeyboardAvoidingView>
    </ReuseExistingPhotosProvider>
  );
}
