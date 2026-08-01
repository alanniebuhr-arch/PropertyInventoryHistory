import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, type KeyboardTypeOptions, type TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from '../../textScale';
import { sharedStyles } from '../../theme';
import { ItemDetailScrollContext } from '../../itemDetailScrollContext';
import { useOptionalKeyboardDoneTextInputProps } from '../../components/KeyboardDoneAccessory';
import { DateInputField } from '../../components/DateInputField';
import { dateInputValue, formatPhoneNumber } from '../../utils';

export function FormField(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const inputRef = useRef<RNTextInput>(null);
  const onFieldFocus = useContext(ItemDetailScrollContext);
  const onScrollFocus = useCallback(() => {
    inputRef.current?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      onFieldFocus?.(y, height);
    });
  }, [onFieldFocus]);
  const keyboardDoneProps = useOptionalKeyboardDoneTextInputProps({
    onFocus: onScrollFocus,
  });
  const isPhone = props.keyboardType === 'phone-pad';
  const displayValue = isPhone ? formatPhoneNumber(props.value) : props.value;

  return (
    <View>
      <Text style={sharedStyles.fieldLabel}>{props.label}</Text>
      <TextInput
        ref={inputRef}
        value={displayValue}
        onChangeText={(text) =>
          props.onChangeText(isPhone ? formatPhoneNumber(text) : text)
        }
        placeholder={props.placeholder}
        placeholderTextColor="#9aa8b8"
        keyboardType={props.keyboardType}
        style={[sharedStyles.input, props.multiline && sharedStyles.inputMultiline]}
        multiline={props.multiline}
        {...keyboardDoneProps}
      />
    </View>
  );
}

export function DateFormField(props: {
  /** Base label without format hint, e.g. "Install date". */
  label: string;
  value?: string;
  onChangeStored: (v: string | undefined) => void;
  parseStored: (v: string) => string | undefined;
  optional?: boolean;
}) {
  const formattedValue = dateInputValue(props.value);
  const [draft, setDraft] = useState(formattedValue);
  const rootRef = useRef<View>(null);
  const onFieldFocus = useContext(ItemDetailScrollContext);
  const scrollIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
        onFieldFocus?.(y, height);
      });
    });
  }, [onFieldFocus]);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  return (
    <View ref={rootRef} collapsable={false}>
      <DateInputField
        label={props.label}
        value={draft}
        optional={props.optional}
        onFocus={scrollIntoView}
        onCalendarOpen={scrollIntoView}
        onChangeText={(nextDraft) => {
          setDraft(nextDraft);
          if (!nextDraft.trim()) {
            props.onChangeStored(undefined);
            return;
          }

          const parsed = props.parseStored(nextDraft);
          if (parsed) props.onChangeStored(parsed);
        }}
      />
    </View>
  );
}
