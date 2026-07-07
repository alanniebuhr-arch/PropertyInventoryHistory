import React from 'react';
import { Modal, Pressable, Text, TextInput } from 'react-native';
import { sharedStyles } from '../theme';

export function RenameModal(props: {
  visible: boolean;
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  placeholder?: string;
  saveLabel?: string;
}) {
  const {
    visible,
    title,
    value,
    onChangeText,
    onSave,
    onClose,
    placeholder,
    saveLabel = 'Save',
  } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
        onPress={onClose}
      >
        <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
          <Text style={sharedStyles.sectionTitle}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={sharedStyles.input}
            autoFocus
            selectTextOnFocus
          />
          <Pressable
            onPress={onSave}
            style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
          >
            <Text style={sharedStyles.primaryBtnText}>{saveLabel}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={sharedStyles.secondaryBtn}>
            <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
