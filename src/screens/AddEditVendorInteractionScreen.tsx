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
import type { AppState, VendorContactMethod, VendorInteraction } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { MultilineEditModal } from '../components/MultilineEditModal';
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
  vendorById,
  vendorInteractionById,
} from '../storage';
import {
  VENDOR_CONTACT_METHOD_OPTIONS,
  vendorContactMethodLabel,
} from '../vendorContactMethod';

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
  const [notesModalOpen, setNotesModalOpen] = useState(false);

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

  function saveInteraction() {
    const occurredAtISO = parseDateInputToISO(dateStr);
    if (!occurredAtISO) {
      Alert.alert('Invalid date', 'Enter a date as MM/DD/YYYY.');
      return;
    }
    const trimmedContact = contactName.trim();
    const trimmedNotes = notes.trim();

    if (existing) {
      const updated: VendorInteraction = {
        ...existing,
        contactMethod,
        contactName: trimmedContact || undefined,
        occurredAtISO,
        notes: trimmedNotes || undefined,
      };
      onSave({
        ...state,
        vendorInteractions: state.vendorInteractions.map((i) =>
          i.id === existing.id ? updated : i
        ),
      });
    } else {
      const interaction: VendorInteraction = {
        id: uid('interaction'),
        vendorId,
        contactMethod,
        contactName: trimmedContact || undefined,
        occurredAtISO,
        notes: trimmedNotes || undefined,
        createdAtISO: nowISO(),
      };
      onSave({
        ...state,
        vendorInteractions: [...state.vendorInteractions, interaction],
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
          onSave(deleteVendorInteractionCascade(state, existing.id));
          onBack();
        },
      },
    ]);
  }

  const notesPreview = notes.trim();

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
        <Pressable
          onPress={() => setNotesModalOpen(true)}
          accessibilityRole="button"
          accessibilityHint="Opens a larger editor for conversation notes"
          style={({ pressed }) => [
            sharedStyles.input,
            sharedStyles.inputMultiline,
            {
              minHeight: 120,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 16,
              lineHeight: 22,
              color: notesPreview ? colors.text : colors.textMuted,
            }}
          >
            {notesPreview || 'Notes from the conversation'}
          </Text>
        </Pressable>
      </ScrollView>

      <MultilineEditModal
        visible={notesModalOpen}
        title="Conversation notes"
        value={notes}
        placeholder="Notes from the conversation"
        onSave={(next) => setNotes(next)}
        onClose={() => setNotesModalOpen(false)}
      />
    </View>
  );
}
