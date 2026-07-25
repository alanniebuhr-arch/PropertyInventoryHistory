import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Text, TextInput } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, PropertyPhoto, PropertyTodo } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { InteractionPhotoSection } from '../components/InteractionPhotoSection';
import { DetailDisplayRow } from '../components/DetailDisplayRow';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { sharedStyles, colors } from '../theme';
import {
  dateInputValue,
  formatDate,
  nowISO,
  parseDateInputToISO,
  uid,
} from '../utils';
import {
  deletePropertyTodoCascade,
  photosForPropertyTodo,
  propertyById,
  propertyTodoById,
} from '../storage';
import { deletePhotoFile, persistPhotoFromUri } from '../photoStorage';

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
  const [todoPhotos, setTodoPhotos] = useState<PropertyPhoto[]>(() =>
    existing ? photosForPropertyTodo(state, existing.id) : []
  );

  const keyboardDone = useKeyboardDoneAccessory({
    id: 'propertyTodoNotesDone',
    label: 'Done',
  });

  // Seed drafts when the to-do record becomes available (e.g. after Create → open).
  // startEditing can be true on first paint before `existing` exists in state.
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDueStr(existing.dueAtISO ? dateInputValue(existing.dueAtISO) : '');
    setNotes(existing.notes ?? '');
    setDone(existing.done);
    setTodoPhotos(photosForPropertyTodo(state, existing.id));
  }, [existing?.id]);

  // Keep view-mode fields in sync with saved data while not editing.
  useEffect(() => {
    if (!existing || isEditing) return;
    setTitle(existing.title);
    setDueStr(existing.dueAtISO ? dateInputValue(existing.dueAtISO) : '');
    setNotes(existing.notes ?? '');
    setDone(existing.done);
    setTodoPhotos(photosForPropertyTodo(state, existing.id));
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
        return {
          id: photoId,
          propertyId,
          todoId: todo.id,
          localUri,
          createdAtISO: nowISO(),
        };
      })
    );
    setTodoPhotos((prev) => [...prev, ...newPhotos]);
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

  function saveTodo(): boolean {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', `Enter a short title for this ${noun}.`);
      return false;
    }

    const trimmedDue = dueStr.trim();
    let dueAtISO: string | undefined;
    if (trimmedDue) {
      dueAtISO = parseDateInputToISO(trimmedDue);
      if (!dueAtISO) {
        Alert.alert('Invalid date', 'Enter a due date as MM/DD/YYYY, or leave it blank.');
        return false;
      }
    }

    const trimmedNotes = notes.trim();
    const photoIds = todoPhotos.map((p) => p.id);
    const completedAtISO = done ? todo.completedAtISO ?? nowISO() : undefined;

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
      ...todo,
      title: trimmedTitle,
      dueAtISO,
      notes: trimmedNotes || undefined,
      done,
      completedAtISO,
      photoIds,
    };
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
            onSave(deletePropertyTodoCascade(state, todo.id));
            onBack();
          })();
        },
      },
    ]);
  }

  const parsedDue = dueStr.trim() ? parseDateInputToISO(dueStr) : undefined;
  const headerLabel = isEditing && isDirty ? '← Cancel' : '← Back';

  return (
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
              <MaterialIcons name="edit" size={22} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </ScreenBackHeader>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0, paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <InteractionPhotoSection
          photos={todoPhotos}
          onAddPhotos={isEditing ? addTodoPhotos : undefined}
          onDeletePhoto={
            isEditing
              ? (photoId) => {
                  void removeTodoPhoto(photoId);
                }
              : undefined
          }
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

            <Text style={sharedStyles.fieldLabel}>Due date</Text>
            <TextInput
              style={sharedStyles.input}
              value={dueStr}
              onChangeText={setDueStr}
              placeholder="MM/DD/YYYY (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              {...keyboardDone.textInputProps}
            />
            {parsedDue ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]}>{formatDate(parsedDue)}</Text>
            ) : null}

            {isIdea ? null : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                <Text style={[sharedStyles.fieldLabel, { marginBottom: 0 }]}>Done</Text>
                <Switch value={done} onValueChange={setDone} />
              </View>
            )}

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Details, location, or reminders"
              placeholderTextColor={colors.textMuted}
              multiline
              {...keyboardDone.textInputProps}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 12 }]}>
            <DetailDisplayRow label="Title" value={todo.title} />
            <DetailDisplayRow
              label="Due date"
              value={todo.dueAtISO ? formatDate(todo.dueAtISO) : undefined}
            />
            {isIdea ? null : (
              <DetailDisplayRow label="Done" value={todo.done ? 'Yes' : 'No'} />
            )}
            <DetailDisplayRow label="Notes" value={todo.notes} stacked />
          </View>
        )}
      </ScrollView>
      {isEditing ? keyboardDone.accessory : null}
    </KeyboardAvoidingView>
  );
}
