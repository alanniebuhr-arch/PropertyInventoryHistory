import React from 'react';
import { Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../textScale';
import { colors } from '../theme';
import { collapsedSectionLabel } from '../utils';

/**
 * Colored Future / Today / History / Undated banner with left title+(count when collapsed)
 * and right expand/collapse chevron.
 */
export function ActivityBucketBanner(props: {
  label: string;
  count: number;
  expanded: boolean;
  /** Today uses danger background; other buckets use sectionTitle. */
  variant: 'today' | 'default';
  onToggle: () => void;
  /** Flush bottom so a framed group body sits directly under the banner. */
  attachedToGroup?: boolean;
}) {
  const { label, count, expanded, variant, onToggle, attachedToGroup } = props;
  const title = collapsedSectionLabel(label, expanded, count);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={expanded ? `Hide ${label}` : `Show ${label}`}
      accessibilityState={{ expanded }}
      style={({ pressed }) => ({
        marginTop: 10,
        marginBottom: attachedToGroup && expanded ? 0 : 6,
        paddingVertical: 3,
        paddingHorizontal: 10,
        backgroundColor: variant === 'today' ? colors.danger : colors.sectionTitle,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: attachedToGroup && expanded ? 0 : 4,
        borderBottomRightRadius: attachedToGroup && expanded ? 0 : 4,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.card,
          textAlign: 'left',
        }}
      >
        {title}
      </Text>
      <MaterialIcons
        name={expanded ? 'expand-less' : 'expand-more'}
        size={20}
        color={colors.card}
      />
    </Pressable>
  );
}
