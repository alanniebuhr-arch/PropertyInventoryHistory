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
import { colors, sharedStyles } from '../theme';
import { useKeyboardDoneAccessory } from './KeyboardDoneAccessory';
import { useKeyboardSheetScroll } from './useKeyboardSheetScroll';

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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);
  const { scrollRef, onScroll, measureAndScroll, contentBottomInset } = useKeyboardSheetScroll();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'renameModalDone',
    variant: 'overlay',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'flex-end',
            }}
            onPress={onClose}
          >
            <Pressable
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
              }}
              onPress={() => {}}
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
                <TextInput
                  ref={inputRef}
                  value={value}
                  onChangeText={onChangeText}
                  placeholder={placeholder}
                  style={sharedStyles.input}
                  autoFocus
                  selectTextOnFocus
                  {...keyboardDone.getTextInputProps({
                    onFocus: () => measureAndScroll(inputRef.current),
                  })}
                />
                <Pressable
                  onPress={onSave}
                  style={({ pressed }) => [
                    sharedStyles.primaryBtn,
                    pressed && sharedStyles.primaryBtnPressed,
                  ]}
                >
                  <Text style={sharedStyles.primaryBtnText}>{saveLabel}</Text>
                </Pressable>
                <Pressable onPress={onClose} style={sharedStyles.secondaryBtn}>
                  <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
        {keyboardDone.accessory}
      </View>
    </Modal>
  );
}
