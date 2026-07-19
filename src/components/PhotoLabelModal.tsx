import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

export function PhotoLabelModal(props: {
  visible: boolean;
  draft: string;
  onChangeDraft: (value: string) => void;
  notesDraft: string;
  onChangeNotesDraft: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  placeholder?: string;
  title?: string;
  saveLabel?: string;
  /** When true, label field is shown but not editable (named slots). */
  labelLocked?: boolean;
}) {
  const {
    visible,
    draft,
    onChangeDraft,
    notesDraft,
    onChangeNotesDraft,
    onSave,
    onClose,
    placeholder = 'e.g. Water hookup, damage',
    title = 'Label photo',
    saveLabel = 'Save',
    labelLocked = false,
  } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.card,
            borderRadius: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            padding: 16,
          }}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{title}</Text>
          <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
            {labelLocked
              ? 'Add notes to show with this photo in the large view.'
              : title === 'Rename label'
                ? 'Update the label and notes shown with this photo.'
                : 'Add a short label and optional notes for this photo.'}
          </Text>
          <Text style={[sharedStyles.cardMeta, { marginBottom: 4 }]}>Label</Text>
          <TextInput
            value={draft}
            onChangeText={onChangeDraft}
            style={[
              sharedStyles.input,
              labelLocked ? { opacity: 0.7, marginBottom: 12 } : { marginBottom: 12 },
            ]}
            placeholder={placeholder}
            autoFocus={!labelLocked}
            editable={!labelLocked}
            maxLength={40}
          />
          <Text style={[sharedStyles.cardMeta, { marginBottom: 4 }]}>Notes</Text>
          <TextInput
            value={notesDraft}
            onChangeText={onChangeNotesDraft}
            style={[sharedStyles.input, { minHeight: 72, textAlignVertical: 'top' }]}
            placeholder="Optional notes shown with the photo"
            autoFocus={labelLocked}
            multiline
            maxLength={500}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={onClose}
              style={[sharedStyles.secondaryBtn, { flex: 1, marginTop: 0 }]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSave} style={[sharedStyles.primaryBtn, { flex: 1, marginTop: 0 }]}>
              <Text style={sharedStyles.primaryBtnText}>{saveLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
