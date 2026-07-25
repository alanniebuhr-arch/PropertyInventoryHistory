import React, { createContext, useContext, useMemo } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { TEXT_SCALE_STEPS } from './appTextScalePrefs';

const TextScaleContext = createContext(1);

export type TextScaleControls = {
  scale: number;
  step: number;
  setStep: (step: number) => void;
  makeLarger: () => void;
  makeSmaller: () => void;
  canMakeLarger: boolean;
  canMakeSmaller: boolean;
};

const TextScaleControlsContext = createContext<TextScaleControls | null>(null);

export function TextScaleProvider(props: {
  scale: number;
  step: number;
  setStep: (step: number) => void;
  children: React.ReactNode;
}) {
  const { scale, step, setStep, children } = props;
  const controls = useMemo<TextScaleControls>(
    () => ({
      scale,
      step,
      setStep,
      makeLarger: () => setStep(Math.min(TEXT_SCALE_STEPS.length - 1, step + 1)),
      makeSmaller: () => setStep(Math.max(0, step - 1)),
      canMakeLarger: step < TEXT_SCALE_STEPS.length - 1,
      canMakeSmaller: step > 0,
    }),
    [scale, step, setStep]
  );

  return (
    <TextScaleContext.Provider value={scale}>
      <TextScaleControlsContext.Provider value={controls}>
        {children}
      </TextScaleControlsContext.Provider>
    </TextScaleContext.Provider>
  );
}

export function useTextScale(): number {
  return useContext(TextScaleContext);
}

export function useTextScaleControls(): TextScaleControls {
  const controls = useContext(TextScaleControlsContext);
  if (!controls) {
    return {
      scale: 1,
      step: 1,
      setStep: () => {},
      makeLarger: () => {},
      makeSmaller: () => {},
      canMakeLarger: false,
      canMakeSmaller: false,
    };
  }
  return controls;
}

/** Scale fontSize / lineHeight for the current app text preference. */
export function scaleTextStyle(
  style: StyleProp<TextStyle>,
  scale: number
): StyleProp<TextStyle> {
  if (scale === 1) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const next: TextStyle = { ...flat };
  if (typeof flat.fontSize === 'number') {
    next.fontSize = Math.round(flat.fontSize * scale);
  }
  if (typeof flat.lineHeight === 'number') {
    next.lineHeight = Math.round(flat.lineHeight * scale);
  }
  return next;
}

export function useScaledTextStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const scale = useTextScale();
  return useMemo(() => scaleTextStyle(style, scale), [style, scale]);
}

/**
 * Drop-in Text that respects the app-wide text scale.
 * Use instead of react-native Text in UI screens/components (not export PNG sheets).
 */
export const Text = React.forwardRef<RNText, TextProps>(function ScaledText(
  { style, ...rest },
  ref
) {
  const scale = useTextScale();
  const scaledStyle = useMemo(() => scaleTextStyle(style, scale), [style, scale]);
  return <RNText ref={ref} {...rest} style={scaledStyle} />;
});

/** Drop-in TextInput that scales fontSize / lineHeight with the app preference. */
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function ScaledTextInput({ style, ...rest }, ref) {
    const scale = useTextScale();
    const scaledStyle = useMemo(() => scaleTextStyle(style, scale), [style, scale]);
    return <RNTextInput ref={ref} {...rest} style={scaledStyle} />;
  }
);
