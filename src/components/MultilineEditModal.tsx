import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { Text, TextInput } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sharedStyles, colors } from '../theme';
import { useKeyboardDoneAccessory } from './KeyboardDoneAccessory';
import { useKeyboardSheetScroll } from './useKeyboardSheetScroll';

export function MultilineEditModal(props: {
  visible: boolean;
  title: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const { visible, title, value, placeholder, onSave, onClose } = props;
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<RNTextInput>(null);
  const { scrollRef, onScroll, measureAndScroll, contentBottomInset } = useKeyboardSheetScroll();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'multilineEditModalDone',
    variant: 'overlay',
  });

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            onPress={onClose}
          >
            <Pressable
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: colors.border,
                maxHeight: windowHeight * 0.85,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: insets.bottom + 20,
              }}
              onPress={() => {}}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={sharedStyles.textLink}>Cancel</Text>
                </Pressable>
              </View>
              <ScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                contentContainerStyle={{ paddingBottom: contentBottomInset }}
              >
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  style={[sharedStyles.input, sharedStyles.inputMultiline, { minHeight: 200 }]}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  {...keyboardDone.getTextInputProps({
                    onFocus: () => measureAndScroll(inputRef.current),
                  })}
                />
                <Pressable
                  onPress={handleSave}
                  style={({ pressed }) => [
                    sharedStyles.primaryBtn,
                    pressed && sharedStyles.primaryBtnPressed,
                  ]}
                >
                  <Text style={sharedStyles.primaryBtnText}>Save</Text>
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
