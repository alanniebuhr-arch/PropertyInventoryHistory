import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, VendorContactMethod, VendorInteraction, VendorPhoto } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { InteractionPhotoSection } from '../components/InteractionPhotoSection';
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

export function AddEditVendorInteractionScreen(props: {
  state: AppState;
  vendorId: string;
  interactionId?: string;
  onBack: () => void;
  onSave: (state: AppState) => void;
}) {
  const { state, vendorId, interactionId, onBack, onSave } = props;
  const insets = useSafeAreaInsets();
  const vendor = vendorById(state, vendorId);
  const existing = interactionId ? vendorInteractionById(state, interactionId) : undefined;

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
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
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

  function saveInteraction() {
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
      };
      onSave({
        ...state,
        vendorInteractions: state.vendorInteractions.map((i) =>
          i.id === existing.id ? updated : i
        ),
        vendorPhotos: [...mergedPhotos, ...newPhotos],
      });
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
      };
      onSave({
        ...state,
        vendorInteractions: [...state.vendorInteractions, interaction],
        vendorPhotos: [...state.vendorPhotos, ...photoRecords],
      });
    }
    onBack();
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

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
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
              accessibilityLabel="Delete interaction"
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
            onPress={saveInteraction}
            accessibilityRole="button"
            accessibilityLabel="Save interaction"
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
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={sharedStyles.title}>{existing ? 'Edit interaction' : 'New interaction'}</Text>
        <Text style={sharedStyles.subtitle}>{vendor.name}</Text>

        <Text style={sharedStyles.fieldLabel}>Date</Text>
        <TextInput
          style={sharedStyles.input}
          value={dateStr}
          onChangeText={setDateStr}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
        />
        {parseDateInputToISO(dateStr) ? (
          <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]}>
            {formatDate(parseDateInputToISO(dateStr)!)}
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
        />

        <Text style={sharedStyles.fieldLabel}>Notes</Text>
        <TextInput
          style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 120 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes from the conversation"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <InteractionPhotoSection
          photos={interactionPhotos}
          onAddPhotos={addInteractionPhotos}
          onDeletePhoto={(photoId) => {
            void removeInteractionPhoto(photoId);
          }}
          onLabelPhoto={handleInteractionPhotoLabel}
          hint="Attach screenshots, quotes, or photos from this interaction."
        />
      </ScrollView>
    </View>
  );
}
