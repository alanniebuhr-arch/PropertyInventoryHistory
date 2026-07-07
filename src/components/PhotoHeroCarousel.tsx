import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';

const HERO_ASPECT = 0.55;

export type HeroPhoto = {
  id: string;
  uri: string;
  label: string;
};

export function PhotoHeroCarousel(props: {
  photos: HeroPhoto[];
  activeId: string | null;
  onActiveIdChange: (id: string) => void;
  onOpenViewer: () => void;
}) {
  const { photos, activeId, onActiveIdChange, onOpenViewer } = props;
  const { width: windowWidth } = useWindowDimensions();
  const heroScrollRef = useRef<ScrollView>(null);
  const skipNextHeroScroll = useRef(false);
  const isInitialHeroScroll = useRef(true);
  const [heroPageWidth, setHeroPageWidth] = useState(Math.max(windowWidth - 32, 1));
  const heroHeight = Math.round(heroPageWidth * HERO_ASPECT);

  const effectiveActiveId = useMemo(() => {
    if (activeId && photos.some((photo) => photo.id === activeId)) {
      return activeId;
    }
    return photos[0]?.id ?? null;
  }, [activeId, photos]);

  const activeIndex = useMemo(() => {
    if (!effectiveActiveId) return 0;
    const index = photos.findIndex((photo) => photo.id === effectiveActiveId);
    return index >= 0 ? index : 0;
  }, [effectiveActiveId, photos]);

  useEffect(() => {
    if (heroPageWidth <= 0 || photos.length === 0) return;
    if (skipNextHeroScroll.current) {
      skipNextHeroScroll.current = false;
      return;
    }
    heroScrollRef.current?.scrollTo({
      x: activeIndex * heroPageWidth,
      animated: !isInitialHeroScroll.current,
    });
    isInitialHeroScroll.current = false;
  }, [activeIndex, heroPageWidth, photos.length]);

  function handleHeroSwipe(index: number) {
    const photo = photos[index];
    if (photo && photo.id !== effectiveActiveId) {
      skipNextHeroScroll.current = true;
      onActiveIdChange(photo.id);
    }
  }

  if (photos.length === 0) return null;

  return (
    <View
      style={{ marginBottom: 12 }}
      onLayout={(e) => setHeroPageWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={heroScrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          if (heroPageWidth <= 0) return;
          const index = Math.round(e.nativeEvent.contentOffset.x / heroPageWidth);
          handleHeroSwipe(index);
        }}
      >
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            onPress={onOpenViewer}
            accessibilityRole="imagebutton"
            accessibilityLabel={photo.label}
            accessibilityHint="Swipe for previous or next photo. Tap to open full screen."
            style={{ width: heroPageWidth }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={{
                width: heroPageWidth,
                height: heroHeight,
                borderRadius: 12,
                backgroundColor: colors.border,
              }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {photos.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
          }}
          accessibilityRole="text"
          accessibilityLabel={`Photo ${activeIndex + 1} of ${photos.length}`}
        >
          {photos.map((photo, index) => (
            <View
              key={photo.id}
              style={{
                width: index === activeIndex ? 8 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: index === activeIndex ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
