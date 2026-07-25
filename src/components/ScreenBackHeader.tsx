import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../textScale';
import { sharedStyles } from '../theme';

export function ScreenBackHeader(props: {
  onPress: () => void;
  label?: string;
  children?: ReactNode;
}) {
  const { onPress, label = '← Back', children } = props;

  return (
    <View style={sharedStyles.screenHeader}>
      <View style={[sharedStyles.headerRow, { marginBottom: 0 }]}>
        <Pressable onPress={onPress} style={sharedStyles.backBtn}>
          <Text style={sharedStyles.backBtnText}>{label}</Text>
        </Pressable>
        {children}
      </View>
    </View>
  );
}
