import React from 'react';
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from '../textScale';
import { sharedStyles } from '../theme';
import { collapsedSectionLabel } from '../utils';

/**
 * Blue section heading. When collapsed with count > 0, tapping the title expands.
 * Expand/collapse chevron remains the control for toggling (including collapse).
 */
export function CollapsibleSectionTitle(props: {
  title: string;
  expanded: boolean;
  /** Item count; heading expands only when collapsed and count > 0. */
  count: number;
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
    onExpand,
    style,
    containerStyle,
    showCountWhenCollapsed = true,
  } = props;

  const label = showCountWhenCollapsed
    ? collapsedSectionLabel(title, expanded, count)
    : title;
  const canExpandFromHeading = !expanded && count > 0;

  const text = (
    <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }, style]}>
      {label}
    </Text>
  );

  if (!canExpandFromHeading) {
    return containerStyle ? <View style={containerStyle}>{text}</View> : text;
  }

  return (
    <Pressable
      onPress={onExpand}
      accessibilityRole="button"
      accessibilityLabel={`Show ${title}`}
      hitSlop={6}
      style={({ pressed }) => [containerStyle, { opacity: pressed ? 0.7 : 1 }]}
    >
      {text}
    </Pressable>
  );
}
