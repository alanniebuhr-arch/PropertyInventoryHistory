import React from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '../theme';

export function RoomNavigationDots(props: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Singular label for accessibility, e.g. "Room" or "Asset". */
  unitLabel?: string;
}) {
  const { count, activeIndex, onSelect, unitLabel = 'Room' } = props;
  if (count <= 1) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}
      accessibilityRole="tablist"
      accessibilityLabel={`${unitLabel} ${activeIndex + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <Pressable
          key={index}
          onPress={() => onSelect(index)}
          accessibilityRole="tab"
          accessibilityState={{ selected: index === activeIndex }}
          accessibilityLabel={`${unitLabel} ${index + 1}`}
          hitSlop={8}
        >
          <View
            style={{
              width: index === activeIndex ? 8 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: index === activeIndex ? colors.primary : colors.border,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}
