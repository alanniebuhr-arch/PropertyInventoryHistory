import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../textScale';
import { sharedStyles, colors } from '../theme';
import { splitHighlightParts } from '../searchSnippet';
import { formatPhoneNumber, formatCurrencyDisplay } from '../utils';
import { boldTodayNodes } from './TextWithBoldToday';

/** Fits longest detail card labels on one line. */
export const DETAIL_LABEL_COLUMN_WIDTH = 136;

export function DetailDisplayRow(props: {
  label: string;
  value?: string;
  /** Label above value, value spans full width (default for Notes fields). */
  stacked?: boolean;
  /** When set, the value is tappable (e.g. open a URL). */
  onPress?: () => void;
  /** When set (view/search), highlight first case-insensitive match in value. */
  highlightQuery?: string;
}) {
  const trimmed = props.value?.trim();
  const formattedPhone =
    trimmed && /phone/i.test(props.label) ? formatPhoneNumber(trimmed) : '';
  const formattedMoney =
    trimmed && /cost|price|paid/i.test(props.label)
      ? formatCurrencyDisplay(trimmed)
      : '';
  const raw = formattedPhone || formattedMoney || trimmed;
  const value = raw || 'Not set';
  const muted = !raw;
  const stacked = props.stacked ?? /notes$/i.test(props.label);
  const canPress = Boolean(raw && props.onPress);
  const highlightQuery = !muted ? props.highlightQuery?.trim() : undefined;
  const parts =
    highlightQuery && raw ? splitHighlightParts(raw, highlightQuery) : null;

  const valueText = (
    <Text
      style={[
        sharedStyles.cardMeta,
        {
          color: muted ? colors.textMuted : canPress ? colors.primary : colors.text,
          fontSize: 15,
          marginTop: 0,
          lineHeight: 22,
          ...(stacked ? null : { flex: 1, textAlign: 'left' as const }),
          ...(canPress ? { textDecorationLine: 'underline' as const } : null),
        },
      ]}
    >
      {parts
        ? parts.map((part, i) =>
            part.highlight ? (
              <Text
                key={i}
                style={{
                  backgroundColor: colors.searchHighlight,
                  color: colors.text,
                  fontWeight: '700',
                }}
              >
                {part.text}
              </Text>
            ) : (
              <Text key={i}>{boldTodayNodes(part.text)}</Text>
            )
          )
        : boldTodayNodes(value)}
    </Text>
  );

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
        {canPress ? (
          <Pressable
            onPress={props.onPress}
            accessibilityRole="link"
            accessibilityLabel={`${props.label}: ${value}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {valueText}
          </Pressable>
        ) : (
          valueText
        )}
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
      {canPress ? (
        <Pressable
          onPress={props.onPress}
          accessibilityRole="link"
          accessibilityLabel={`${props.label}: ${value}`}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
        >
          {valueText}
        </Pressable>
      ) : (
        valueText
      )}
    </View>
  );
}
