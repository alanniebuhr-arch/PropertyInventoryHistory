import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '../textScale';
import { colors } from '../theme';

export function PinGearMenuItem(props: {
  pinned: boolean;
  onToggle: () => void;
}) {
  const { pinned, onToggle } = props;
  const label = pinned ? 'Unpin' : 'Pin';
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        pinned ? 'Removes this item from Home Pinned.' : 'Adds this item to Home Pinned.'
      }
      style={({ pressed }) => ({
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>{label}</Text>
    </Pressable>
  );
}
