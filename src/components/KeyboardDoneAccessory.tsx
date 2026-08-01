import React, { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native';
import { Text } from '../textScale';
import { colors } from '../theme';

type FocusEvent = NativeSyntheticEvent<TextInputFocusEventData>;

export type KeyboardDoneTextInputExtra = {
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
};

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

type KeyboardDoneContextValue = {
  getTextInputProps: (extra?: KeyboardDoneTextInputExtra) => {
    inputAccessoryViewID?: string;
    onFocus: (e: FocusEvent) => void;
    onBlur: (e: FocusEvent) => void;
  };
};

export const KeyboardDoneTextInputContext = React.createContext<KeyboardDoneContextValue | null>(
  null
);

/** Merge Enter-dismiss handlers with a field's own focus/blur logic. */
export function useOptionalKeyboardDoneTextInputProps(extra?: KeyboardDoneTextInputExtra) {
  const ctx = useContext(KeyboardDoneTextInputContext);
  return useMemo(() => {
    if (!ctx) {
      return {
        onFocus: extra?.onFocus,
        onBlur: extra?.onBlur,
      };
    }
    return ctx.getTextInputProps(extra);
  }, [ctx, extra?.onFocus, extra?.onBlur]);
}

/**
 * iOS InputAccessoryView + Android/web fallback bar above the keyboard,
 * modeled after Playing Card Scoring's NumericInput dismiss accessory.
 *
 * Use `variant: 'overlay'` inside a React Native Modal — native InputAccessoryView
 * (and a nested accessory Modal) often do not appear there.
 */
export function useKeyboardDoneAccessory(options?: {
  /** Stable id shared by TextInputs that should show this accessory. */
  id?: string;
  /** Called after the keyboard is dismissed (e.g. close Edit section). */
  onDone?: () => void;
  label?: string;
  /**
   * `native` — iOS InputAccessoryView + Android modal fallback (default).
   * `overlay` — absolute bar in the parent; required inside RN Modal.
   */
  variant?: 'native' | 'overlay';
}) {
  const generatedId = useId();
  const accessoryNativeId = sanitizeAccessoryId(options?.id ?? `kbdDone_${generatedId}`);
  const [barVisible, setBarVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(options?.onDone);
  onDoneRef.current = options?.onDone;
  const label = options?.label ?? 'Enter';
  const variant = options?.variant ?? 'native';
  const useOverlay = variant === 'overlay';

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const needsKeyboardHeight = useOverlay || (barVisible && Platform.OS !== 'ios');
    if (!needsKeyboardHeight) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [barVisible, useOverlay]);

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

  const getTextInputProps = useCallback(
    (extra?: KeyboardDoneTextInputExtra) => ({
      inputAccessoryViewID:
        !useOverlay && Platform.OS === 'ios' ? accessoryNativeId : undefined,
      onFocus: (e: FocusEvent) => {
        showBar();
        extra?.onFocus?.(e);
      },
      onBlur: (e: FocusEvent) => {
        scheduleHideBar();
        extra?.onBlur?.(e);
      },
    }),
    [accessoryNativeId, scheduleHideBar, showBar, useOverlay]
  );

  const textInputProps = useMemo(() => getTextInputProps(), [getTextInputProps]);

  const contextValue = useMemo(() => ({ getTextInputProps }), [getTextInputProps]);

  const overlayBar =
    barVisible && keyboardHeight > 0 ? (
      <View
        style={[styles.overlayBar, { bottom: keyboardHeight }]}
        pointerEvents="box-none"
      >
        <DoneAccessoryBar onPress={dismiss} label={label} />
      </View>
    ) : null;

  const accessory = useOverlay ? (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      {overlayBar}
    </View>
  ) : (
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

  return {
    textInputProps,
    getTextInputProps,
    contextValue,
    accessory,
    dismiss,
    accessoryNativeId,
  };
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
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  overlayBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
