import React, { useContext, useRef } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { sharedStyles } from '../../theme';
import { ItemDetailScrollContext } from '../../itemDetailScrollContext';

export function FormField(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const inputRef = useRef<TextInput>(null);
  const onFieldFocus = useContext(ItemDetailScrollContext);

  return (
    <View>
      <Text style={sharedStyles.fieldLabel}>{props.label}</Text>
      <TextInput
        ref={inputRef}
        value={props.value}
        onChangeText={props.onChangeText}
        onFocus={() => {
          inputRef.current?.measureInWindow((_x, y, _w, height) => {
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
