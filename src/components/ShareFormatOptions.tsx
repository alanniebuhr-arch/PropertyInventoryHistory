import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import { DEFAULT_SHARE_FORMATS, type ShareFormat } from '../shareFormat';

const OPTION_LABELS: Record<ShareFormat, string> = {
  png: 'Image (PNG)',
  pdf: 'PDF',
  text: 'Clipboard',
};

/** Compact format chooser for share option sheets. */
export function ShareFormatOptions(props: {
  value: ShareFormat;
  onChange: (format: ShareFormat) => void;
  /** Defaults to PNG and PDF. Pass `['png','pdf','text']` to include Text. */
  formats?: ShareFormat[];
}) {
  const { value, onChange, formats = DEFAULT_SHARE_FORMATS } = props;

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={[sharedStyles.cardMeta, { marginBottom: 4 }]}>Format</Text>
      {formats.map((format) => {
        const selected = value === format;
        const label = OPTION_LABELS[format];
        return (
          <Pressable
            key={format}
            onPress={() => onChange(format)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
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
            <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{label}</Text>
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
