import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

export function PhotoLabelModal(props: {
  visible: boolean;
  draft: string;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  placeholder?: string;
  title?: string;
  saveLabel?: string;
}) {
  const {
    visible,
    draft,
    onChangeDraft,
    onSave,
    onClose,
    placeholder = 'e.g. Water hookup, damage',
    title = 'Label photo',
    saveLabel = 'Save',
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
            {title === 'Rename label'
              ? 'Update the label shown under this photo.'
              : 'Add a short label to describe this photo.'}
          </Text>
          <TextInput
            value={draft}
            onChangeText={onChangeDraft}
            style={sharedStyles.input}
            placeholder={placeholder}
            autoFocus
            maxLength={40}
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
