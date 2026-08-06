import React from 'react';
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from '../textScale';
import { sharedStyles } from '../theme';
import { collapsedSectionLabel } from '../utils';

/**
 * Blue section heading. When count > 0, tapping the title expands or collapses.
 * Expand/collapse chevron remains an alternate toggle control.
 */
export function CollapsibleSectionTitle(props: {
  title: string;
  expanded: boolean;
  /** Item count; heading toggles only when count > 0. */
  count: number;
  /** When set, collapsed label is (count/doneCount). */
  doneCount?: number;
  onExpand: () => void;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** When false, show plain title (no (N) when collapsed). Default true. */
  showCountWhenCollapsed?: boolean;
}) {
  const {
    title,
    expanded,
    count,
    doneCount,
    onExpand,
    style,
    containerStyle,
    showCountWhenCollapsed = true,
  } = props;

  const label = showCountWhenCollapsed
    ? collapsedSectionLabel(title, expanded, count, doneCount)
    : title;
  const canToggleFromHeading = count > 0;

  const text = (
    <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }, style]}>
      {label}
    </Text>
  );

  if (!canToggleFromHeading) {
    return containerStyle ? <View style={containerStyle}>{text}</View> : text;
  }

  return (
    <Pressable
      onPress={onExpand}
      accessibilityRole="button"
      accessibilityLabel={expanded ? `Hide ${title}` : `Show ${title}`}
      accessibilityState={{ expanded }}
      hitSlop={6}
      style={({ pressed }) => [containerStyle, { opacity: pressed ? 0.7 : 1 }]}
    >
      {text}
    </Pressable>
  );
}
