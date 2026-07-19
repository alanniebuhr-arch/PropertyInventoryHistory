import React from 'react';
import { Text, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

/** Fits longest detail card labels on one line. */
export const DETAIL_LABEL_COLUMN_WIDTH = 136;

export function DetailDisplayRow(props: {
  label: string;
  value?: string;
  /** Label above value, value spans full width (default for Notes fields). */
  stacked?: boolean;
}) {
  const raw = props.value?.trim();
  const value = raw || 'Not set';
  const muted = !raw;
  const stacked = props.stacked ?? /notes$/i.test(props.label);

  if (stacked) {
    return (
      <View style={{ marginBottom: 10 }}>
        <Text
          style={[
            sharedStyles.fieldLabel,
            {
              marginTop: 0,
              marginBottom: 4,
            },
          ]}
        >
          {props.label}
        </Text>
        <Text
          style={[
            sharedStyles.cardMeta,
            {
              color: muted ? colors.textMuted : colors.text,
              fontSize: 15,
              marginTop: 0,
              lineHeight: 22,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
        gap: 12,
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
          {
            color: muted ? colors.textMuted : colors.text,
            fontSize: 15,
            flex: 1,
            textAlign: 'left',
            marginTop: 0,
            lineHeight: 22,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
