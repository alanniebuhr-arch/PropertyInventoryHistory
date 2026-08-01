import React, { useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextInput as RNTextInput,
  type TextInputFocusEventData,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextInput } from '../textScale';
import { colors, sharedStyles } from '../theme';
import {
  dateInputPlaceholder,
  dateInputValue,
  formatWeekdayWithRelative,
  parseDateInputToISO,
} from '../utils';
import { useOptionalKeyboardDoneTextInputProps } from './KeyboardDoneAccessory';

function dateFromLocaleInputOrNow(input: string): Date {
  const iso = parseDateInputToISO(input);
  if (!iso) return new Date();
  return new Date(iso);
}

function localeDateInputFromPickerDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return dateInputValue(`${year}-${month}-${day}`);
}

export function DateInputField(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** When true, placeholder notes the field can be blank. */
  optional?: boolean;
  onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  /** Called after the calendar opens (keyboard already dismissed) so parents can scroll it into view. */
  onCalendarOpen?: () => void;
}) {
  const { label, value, onChangeText, optional, onFocus, onCalendarOpen } = props;
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<RNTextInput>(null);
  const keyboardDoneProps = useOptionalKeyboardDoneTextInputProps(
    onFocus ? { onFocus } : undefined
  );
  const parsedISO = value.trim() ? parseDateInputToISO(value) : undefined;
  const placeholder = optional
    ? `${dateInputPlaceholder()} (optional)`
    : dateInputPlaceholder();

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selected) {
      onChangeText(localeDateInputFromPickerDate(selected));
    }
  }

  function toggleCalendar() {
    if (showPicker) {
      setShowPicker(false);
      return;
    }
    // Keyboard covers the inline calendar if left open.
    Keyboard.dismiss();
    inputRef.current?.blur();
    if (!parseDateInputToISO(value)) {
      onChangeText(localeDateInputFromPickerDate(new Date()));
    }
    setShowPicker(true);
    // Wait for keyboard hide so layout reflects available space before scrolling.
    setTimeout(() => onCalendarOpen?.(), Platform.OS === 'ios' ? 350 : 100);
  }

  return (
    <View style={{ marginBottom: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <Text style={[sharedStyles.fieldLabel, { marginBottom: 0 }]}>{label}</Text>
        <Pressable
          onPress={toggleCalendar}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${label.toLowerCase()} from calendar`}
          hitSlop={8}
          style={({ pressed }) => ({
            padding: 4,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialIcons name="calendar-today" size={22} color={colors.primary} />
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 4,
        }}
      >
        <TextInput
          ref={inputRef}
          style={[sharedStyles.input, { width: 178, marginBottom: 0 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
          {...keyboardDoneProps}
        />
        {parsedISO ? (
          <Text style={[sharedStyles.cardMeta, { marginTop: 0, flexShrink: 1 }]}>
            {formatWeekdayWithRelative(parsedISO)}
          </Text>
        ) : null}
      </View>
      {showPicker ? (
        <View
          style={{
            marginBottom: 8,
            marginTop: 4,
            backgroundColor: colors.calendarPopupBg,
            borderRadius: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 8,
          }}
        >
          <DateTimePicker
            value={dateFromLocaleInputOrNow(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onPickerChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setShowPicker(false)}
              style={({ pressed }) => [
                sharedStyles.secondaryBtn,
                { marginTop: 4 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
