import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';

function sanitizeAccessoryId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function DoneAccessoryBar(props: { onPress: () => void; label?: string }) {
  const { onPress, label = 'Enter' } = props;
  return (
    <View style={styles.dismissBar}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
      >
        <Text style={styles.doneButtonText}>{label}</Text>
      </Pressable>
    </View>
  );
}

/**
 * iOS InputAccessoryView + Android/web fallback bar above the keyboard,
 * modeled after Playing Card Scoring's NumericInput dismiss accessory.
 */
export function useKeyboardDoneAccessory(options?: {
  /** Stable id shared by TextInputs that should show this accessory. */
  id?: string;
  /** Called after the keyboard is dismissed (e.g. close Edit section). */
  onDone?: () => void;
  label?: string;
}) {
  const generatedId = useId();
  const accessoryNativeId = sanitizeAccessoryId(options?.id ?? `kbdDone_${generatedId}`);
  const [barVisible, setBarVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(options?.onDone);
  onDoneRef.current = options?.onDone;
  const label = options?.label ?? 'Enter';

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!barVisible || Platform.OS === 'ios') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [barVisible]);

  const showBar = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setBarVisible(true);
  }, []);

  const scheduleHideBar = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      setBarVisible(false);
      blurTimerRef.current = null;
    }, 120);
  }, []);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    setBarVisible(false);
    onDoneRef.current?.();
  }, []);

  const textInputProps = {
    inputAccessoryViewID: Platform.OS === 'ios' ? accessoryNativeId : undefined,
    onFocus: showBar,
    onBlur: scheduleHideBar,
  };

  const accessory = (
    <>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryNativeId}>
          <DoneAccessoryBar onPress={dismiss} label={label} />
        </InputAccessoryView>
      ) : null}
      {Platform.OS !== 'ios' && barVisible ? (
        <Modal visible transparent animationType="none" onRequestClose={dismiss}>
          <View style={styles.fallbackModalRoot} pointerEvents="box-none">
            <View style={[styles.fallbackBar, { marginBottom: keyboardHeight }]} pointerEvents="box-none">
              <DoneAccessoryBar onPress={dismiss} label={label} />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );

  return { textInputProps, accessory, dismiss, accessoryNativeId };
}

const styles = StyleSheet.create({
  dismissBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
  },
  doneButton: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonPressed: {
    opacity: 0.7,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.sectionTitle,
  },
  fallbackBar: {
    width: '100%',
  },
  fallbackModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
