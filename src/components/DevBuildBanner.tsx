import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isDevBuild } from '../isDevBuild';
import { colors } from '../theme';

/** Thin top strip shown only in Expo Go / Metro debug — not TestFlight or App Store. */
export function DevBuildBanner() {
  const insets = useSafeAreaInsets();
  if (!isDevBuild()) return null;

  const height = Math.max(insets.top, 22);

  return (
    <View
      pointerEvents="none"
      accessibilityLabel="Development build"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height,
        backgroundColor: colors.devBanner,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 2,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.4,
          color: colors.card,
        }}
      >
        DEV
      </Text>
    </View>
  );
}
