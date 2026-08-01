import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../textScale';
import { colors, sharedStyles } from '../theme';
import type { SharePhotoMode } from '../sharePhotoMode';

const OPTIONS: { mode: SharePhotoMode; label: string }[] = [
  { mode: 'all', label: 'All photos' },
  { mode: 'favorites', label: 'Favorites only' },
];

/** Compact All photos / Favorites only chooser for share option sheets. */
export function SharePhotoModeOptions(props: {
  value: SharePhotoMode;
  onChange: (mode: SharePhotoMode) => void;
}) {
  const { value, onChange } = props;

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={[sharedStyles.cardMeta, { marginBottom: 4 }]}>Photos to include</Text>
      {OPTIONS.map((opt) => {
        const selected = value === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => onChange(opt.mode)}
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
