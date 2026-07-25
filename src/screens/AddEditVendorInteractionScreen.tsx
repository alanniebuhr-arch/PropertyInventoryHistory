import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { ScrollView as RNScrollView } from 'react-native';
import { Text, TextInput } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, VendorContactMethod, VendorInteraction, VendorPhoto } from '../types';
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
  deleteVendorInteractionCascade,
  photosForVendorInteraction,
  vendorById,
  vendorInteractionById,
} from '../storage';
import {
  VENDOR_CONTACT_METHOD_OPTIONS,
  vendorContactMethodLabel,
} from '../vendorContactMethod';
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

export function AddEditVendorInteractionScreen(props: {
  state: AppState;
  vendorId: string;
  interactionId?: string;
  onBack: () => void;
  onGoToProperty: () => void;
  /** After creating a new interaction, parent should pin the new id in the route. */
  onCreated: (interactionId: string) => void;
  onSave: (state: AppState) => void | Promise<void>;
}) {
  const { state, vendorId, interactionId, onBack, onGoToProperty, onCreated, onSave } = props;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<RNScrollView>(null);
  const vendor = vendorById(state, vendorId);
  const existing = interactionId ? vendorInteractionById(state, interactionId) : undefined;

  const [isEditing, setIsEditing] = useState(!existing);
  const [dateStr, setDateStr] = useState(() =>
    dateInputValue(existing?.occurredAtISO ?? nowISO())
  );
  const [contactMethod, setContactMethod] = useState<VendorContactMethod>(
    existing?.contactMethod ?? 'phone_call'
  );
  const [contactName, setContactName] = useState(
    existing?.contactName ?? vendor?.contactName ?? ''
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  /** Draft photos while editing — persisted on Save (same pattern as eventPhotos). */
  const [interactionPhotos, setInteractionPhotos] = useState<VendorPhoto[]>(() =>
    existing ? photosForVendorInteraction(state, existing.id) : []
  );

  const keyboardDone = useKeyboardDoneAccessory({
    id: 'vendorInteractionNotesDone',
    label: 'Done',
  });

  if (!vendor) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>Vendor not found.</Text>
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

  function resetDraftFromExisting() {
    if (!existing) return;
    setDateStr(dateInputValue(existing.occurredAtISO));
    setContactMethod(existing.contactMethod);
    setContactName(existing.contactName ?? vendor?.contactName ?? '');
    setNotes(existing.notes ?? '');
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
        return {
          id: photoId,
          vendorId,
          interactionId: existing?.id,
          localUri,
          createdAtISO: nowISO(),
        };
      })
    );
    setInteractionPhotos((prev) => [...prev, ...newPhotos]);
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
  }

  async function removeInteractionPhoto(photoId: string) {
    const photo = interactionPhotos.find((p) => p.id === photoId);
    if (photo) await deletePhotoFile(photo.localUri);
    setInteractionPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function saveInteraction() {
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert('Invalid date', 'Enter a date as MM/DD/YYYY.');
      return;
    }
    const trimmedContact = contactName.trim();
    const trimmedNotes = notes.trim();
    const photoIds = interactionPhotos.map((p) => p.id);

    if (existing) {
      // Mirror AddEditEventScreen event-photo merge on edit.
      const removedPhotoIds = new Set(
        photosForVendorInteraction(state, existing.id)
          .map((p) => p.id)
          .filter((id) => !photoIds.includes(id))
      );
      const updatedPhotos = interactionPhotos.map((p) => ({
        ...p,
        interactionId: existing.id,
      }));
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
        contactMethod,
        contactName: trimmedContact || undefined,
        occurredAtISO,
        notes: trimmedNotes || undefined,
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
      const photoRecords = interactionPhotos.map((p) => ({
        ...p,
        interactionId: newInteractionId,
      }));
      const interaction: VendorInteraction = {
        id: newInteractionId,
        vendorId,
        contactMethod,
        contactName: trimmedContact || undefined,
        occurredAtISO,
        notes: trimmedNotes || undefined,
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
      onCreated(newInteractionId);
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

  return (
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
              <MaterialIcons name="edit" size={22} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </ScreenBackHeader>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0, paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <InteractionPhotoSection
          photos={interactionPhotos}
          onAddPhotos={isEditing ? addInteractionPhotos : undefined}
          onDeletePhoto={
            isEditing
              ? (photoId) => {
                  void removeInteractionPhoto(photoId);
                }
              : undefined
          }
          onLabelPhoto={isEditing ? handleInteractionPhotoLabel : undefined}
          hint={
            isEditing
              ? 'Attach screenshots, quotes, or photos from this interaction.'
              : undefined
          }
        >
          <Text style={sharedStyles.title}>{title}</Text>
          <Text style={sharedStyles.subtitle}>{vendor.name}</Text>
        </InteractionPhotoSection>

        {isEditing ? (
          <>
            <Text style={sharedStyles.fieldLabel}>Date</Text>
            <TextInput
              style={sharedStyles.input}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              {...keyboardDone.textInputProps}
            />
            {occurredAtISO ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]}>
                {formatDate(occurredAtISO)}
              </Text>
            ) : null}

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

            <Text style={sharedStyles.fieldLabel}>Contact person</Text>
            <TextInput
              style={sharedStyles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Person you spoke with"
              placeholderTextColor={colors.textMuted}
              {...keyboardDone.textInputProps}
            />

            <Text style={sharedStyles.fieldLabel}>Notes</Text>
            <TextInput
              style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes from the conversation"
              placeholderTextColor={colors.textMuted}
              multiline
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              }}
              {...keyboardDone.textInputProps}
            />
          </>
        ) : (
          <View style={[sharedStyles.catalogSection, { marginTop: 12 }]}>
            <DetailDisplayRow
              label="Date"
              value={occurredAtISO ? formatDate(occurredAtISO) : dateStr}
            />
            <DetailDisplayRow
              label="How contacted"
              value={vendorContactMethodLabel(contactMethod)}
            />
            <DetailDisplayRow label="Contact person" value={contactName} />
            <DetailDisplayRow label="Notes" value={notes} stacked />
          </View>
        )}
      </ScrollView>
      {isEditing ? keyboardDone.accessory : null}
    </KeyboardAvoidingView>
  );
}
