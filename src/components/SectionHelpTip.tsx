import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../textScale';
import { colors } from '../theme';

export function SectionHelpTip(props: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.helpBg,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
      }}
      accessibilityRole="text"
    >
      <Text style={{ fontSize: 14, lineHeight: 20, color: colors.helpText }}>{props.children}</Text>
    </View>
  );
}
