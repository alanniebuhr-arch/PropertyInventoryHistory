import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Approximate height of the overlay Enter dismiss bar. */
const ENTER_BAR_HEIGHT = 48;

/**
 * Scroll-into-view helpers for TextInputs inside Modal bottom sheets / popups
 * so the keyboard (and Enter bar) do not cover the focused field.
 */
export function useKeyboardSheetScroll(options?: { extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingRef = useRef<{ y: number; height: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const extraBottom = options?.extraBottom ?? ENTER_BAR_HEIGHT;

  const scrollFieldIntoView = useCallback(
    (windowY: number, height: number, kbHeight: number) => {
      const visibleBottom =
        Dimensions.get('window').height -
        kbHeight -
        extraBottom -
        Math.max(insets.bottom, 8) -
        16;
      const fieldBottom = windowY + height;
      if (fieldBottom > visibleBottom) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollYRef.current + (fieldBottom - visibleBottom)),
          animated: true,
        });
      }
    },
    [extraBottom, insets.bottom]
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kb = e.endCoordinates.height;
      setKeyboardHeight(kb);
      const pending = pendingRef.current;
      if (pending) {
        scrollFieldIntoView(pending.y, pending.height, kb);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      pendingRef.current = null;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFieldIntoView]);

  const onFieldFocus = useCallback(
    (windowY: number, height: number) => {
      pendingRef.current = { y: windowY, height };
      scrollFieldIntoView(windowY, height, keyboardHeight || 320);
    },
    [keyboardHeight, scrollFieldIntoView]
  );

  const measureAndScroll = useCallback(
    (node: { measureInWindow: View['measureInWindow'] } | null) => {
      requestAnimationFrame(() => {
        node?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
          onFieldFocus(y, height);
        });
      });
    },
    [onFieldFocus]
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return {
    scrollRef,
    keyboardHeight,
    onScroll,
    measureAndScroll,
    /** Bottom padding so the last field can scroll above the keyboard. */
    contentBottomInset: Math.max(insets.bottom, 20) + 24,
  };
}
