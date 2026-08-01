import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import type { ShareFormat } from '../shareFormat';

const OPTIONS: { format: ShareFormat; label: string }[] = [
  { format: 'png', label: 'Image (PNG)' },
  { format: 'pdf', label: 'PDF' },
];

/** Compact PNG / PDF chooser for share option sheets. */
export function ShareFormatOptions(props: {
  value: ShareFormat;
  onChange: (format: ShareFormat) => void;
}) {
  const { value, onChange } = props;

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={[sharedStyles.cardMeta, { marginBottom: 4 }]}>Format</Text>
      {OPTIONS.map((opt) => {
        const selected = value === opt.format;
        return (
          <Pressable
            key={opt.format}
            onPress={() => onChange(opt.format)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 12,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{opt.label}</Text>
            {selected ? (
              <MaterialIcons name="check" size={22} color={colors.primary} />
            ) : (
              <View style={{ width: 22 }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
