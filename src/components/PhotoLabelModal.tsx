import React, { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../textScale';
import { sharedStyles, colors } from '../theme';
import { useKeyboardDoneAccessory } from './KeyboardDoneAccessory';
import { useKeyboardSheetScroll } from './useKeyboardSheetScroll';

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
  const insets = useSafeAreaInsets();
  const labelRef = useRef<RNTextInput>(null);
  const notesRef = useRef<RNTextInput>(null);
  const { scrollRef, onScroll, measureAndScroll, contentBottomInset } = useKeyboardSheetScroll();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'photoLabelModalDone',
    variant: 'overlay',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.45)',
              justifyContent: 'flex-end',
            }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderWidth: StyleSheet.hairlineWidth,
                borderBottomWidth: 0,
                borderColor: colors.border,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: insets.bottom + 20,
                maxHeight: '92%',
              }}
            >
              <ScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                contentContainerStyle={{ paddingBottom: contentBottomInset }}
              >
                <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>{title}</Text>
                <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
                  {labelLocked
                    ? 'Add notes to show with this photo in the large view.'
                    : title === 'Rename label'
                      ? 'Update the label and notes shown with this photo.'
                      : 'Add a short label and optional notes for this photo.'}
                </Text>
                <Text style={[sharedStyles.cardMeta, { marginBottom: 4, marginTop: 0 }]}>
                  Label
                </Text>
                <TextInput
                  ref={labelRef}
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
                  {...keyboardDone.getTextInputProps({
                    onFocus: () => measureAndScroll(labelRef.current),
                  })}
                />
                <Text style={[sharedStyles.cardMeta, { marginBottom: 4, marginTop: 0 }]}>
                  Notes
                </Text>
                <TextInput
                  ref={notesRef}
                  value={notesDraft}
                  onChangeText={onChangeNotesDraft}
                  style={[sharedStyles.input, { minHeight: 72, textAlignVertical: 'top' }]}
                  placeholder="Optional notes shown with the photo"
                  autoFocus={labelLocked}
                  multiline
                  maxLength={500}
                  {...keyboardDone.getTextInputProps({
                    onFocus: () => measureAndScroll(notesRef.current),
                  })}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={onClose}
                    style={[sharedStyles.secondaryBtn, { flex: 1, marginTop: 0 }]}
                  >
                    <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={onSave}
                    style={[sharedStyles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  >
                    <Text style={sharedStyles.primaryBtnText}>{saveLabel}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
        {keyboardDone.accessory}
      </View>
    </Modal>
  );
}
