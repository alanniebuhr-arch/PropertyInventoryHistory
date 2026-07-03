import React from 'react';
import { Text, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

/** Fits longest detail card labels on one line. */
export const DETAIL_LABEL_COLUMN_WIDTH = 136;

export function DetailDisplayRow(props: { label: string; value?: string }) {
  const value = props.value?.trim() || 'Not set';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 6,
      }}
    >
      <Text
        style={[
          sharedStyles.fieldLabel,
          {
            marginTop: 0,
            marginBottom: 0,
            width: DETAIL_LABEL_COLUMN_WIDTH,
            flexShrink: 0,
          },
        ]}
        numberOfLines={1}
      >
        {props.label}
      </Text>
      <Text
        style={[
          sharedStyles.cardMeta,
          { color: colors.text, fontSize: 15, flex: 1, textAlign: 'left', marginTop: 0 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
