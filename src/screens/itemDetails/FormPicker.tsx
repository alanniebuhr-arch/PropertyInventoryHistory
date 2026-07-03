import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, sharedStyles } from '../../theme';

export function FormPicker<T extends string>(props: {
  label: string;
  options: { value: T; label: string }[];
  value?: T;
  onChange: (value: T | undefined) => void;
  placeholder?: string;
  displayValue?: string;
  allowClear?: boolean;
}) {
  const {
    label,
    options,
    value,
    onChange,
    placeholder = 'Not set',
    displayValue,
    allowClear = true,
  } = props;
  const [open, setOpen] = useState(false);

  const selectedLabel =
    displayValue ??
    options.find((option) => option.value === value)?.label ??
    placeholder;
  const hasValue = value != null;

  function select(next: T | undefined) {
    onChange(next);
    setOpen(false);
  }

  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}, ${selectedLabel}`}
        style={({ pressed }) => [
          sharedStyles.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomLeftRadius: open ? 0 : 8,
            borderBottomRightRadius: open ? 0 : 8,
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            color: hasValue ? colors.text : colors.textMuted,
          }}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Text style={{ fontSize: 18, color: colors.textMuted, marginLeft: 8 }}>
          {open ? '▴' : '▾'}
        </Text>
      </Pressable>

      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: colors.border,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            backgroundColor: colors.card,
            overflow: 'hidden',
          }}
        >
          {allowClear ? (
            <Pressable
              onPress={() => select(undefined)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  backgroundColor: value == null ? '#eef4fc' : colors.card,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: value == null ? colors.primary : colors.textMuted,
                  fontWeight: value == null ? '600' : '400',
                }}
              >
                {placeholder}
              </Text>
            </Pressable>
          ) : null}
          {options.map((option, index) => {
            const selected = value === option.value;
            const isLast = index === options.length - 1;
            return (
              <Pressable
                key={option.value}
                onPress={() => select(option.value)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.border,
                    backgroundColor: selected ? '#eef4fc' : colors.card,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: selected ? colors.primary : colors.text,
                    fontWeight: selected ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
