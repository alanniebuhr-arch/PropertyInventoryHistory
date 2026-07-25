import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, type KeyboardTypeOptions, type TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from '../../textScale';
import { sharedStyles } from '../../theme';
import { ItemDetailScrollContext } from '../../itemDetailScrollContext';
import { dateInputValue } from '../../utils';

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

  return (
    <View>
      <Text style={sharedStyles.fieldLabel}>{props.label}</Text>
      <TextInput
        ref={inputRef}
        value={props.value}
        onChangeText={props.onChangeText}
        onFocus={() => {
          inputRef.current?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
            onFieldFocus?.(y, height);
          });
        }}
        placeholder={props.placeholder}
        placeholderTextColor="#9aa8b8"
        keyboardType={props.keyboardType}
        style={[sharedStyles.input, props.multiline && sharedStyles.inputMultiline]}
        multiline={props.multiline}
      />
    </View>
  );
}

export function DateFormField(props: {
  label: string;
  value?: string;
  onChangeStored: (v: string | undefined) => void;
  parseStored: (v: string) => string | undefined;
  placeholder?: string;
}) {
  const formattedValue = dateInputValue(props.value);
  const [draft, setDraft] = useState(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  return (
    <FormField
      label={props.label}
      value={draft}
      onChangeText={(nextDraft) => {
        setDraft(nextDraft);
        if (!nextDraft.trim()) {
          props.onChangeStored(undefined);
          return;
        }

        const parsed = props.parseStored(nextDraft);
        if (parsed) props.onChangeStored(parsed);
      }}
      placeholder={props.placeholder}
      keyboardType="numbers-and-punctuation"
    />
  );
}
