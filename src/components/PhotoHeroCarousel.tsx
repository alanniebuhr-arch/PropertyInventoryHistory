import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';

const HERO_ASPECT = 0.78;

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
  /** Where to show page indicator dots. Default: below the image. */
  dotsPosition?: 'above' | 'below';
}) {
  const { photos, activeId, onActiveIdChange, onOpenViewer, dotsPosition = 'below' } = props;
  const { width: windowWidth } = useWindowDimensions();
  const heroScrollRef = useRef<ScrollView>(null);
  const skipNextHeroScroll = useRef(false);
  const isInitialHeroScroll = useRef(true);
  const [heroPageWidth, setHeroPageWidth] = useState(Math.max(windowWidth - 32, 1));
  const heroHeight = Math.round(heroPageWidth * HERO_ASPECT);

  const loops = photos.length > 1;

  const carouselPhotos = useMemo(() => {
    if (!loops) return photos;
    return [photos[photos.length - 1], ...photos, photos[0]];
  }, [loops, photos]);

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

  const photoIds = photos.map((photo) => photo.id).join(',');

  useEffect(() => {
    isInitialHeroScroll.current = true;
  }, [photoIds]);

  useEffect(() => {
    if (heroPageWidth <= 0 || photos.length === 0) return;
    if (skipNextHeroScroll.current) {
      skipNextHeroScroll.current = false;
      return;
    }
    const scrollIndex = loops ? activeIndex + 1 : activeIndex;
    heroScrollRef.current?.scrollTo({
      x: scrollIndex * heroPageWidth,
      animated: !isInitialHeroScroll.current,
    });
    isInitialHeroScroll.current = false;
  }, [activeIndex, heroPageWidth, photos.length, loops]);

  function handleHeroSwipe(index: number) {
    const photo = photos[index];
    if (photo && photo.id !== effectiveActiveId) {
      skipNextHeroScroll.current = true;
      onActiveIdChange(photo.id);
    }
  }

  function handleScrollEnd(offsetX: number) {
    if (heroPageWidth <= 0) return;
    const scrollIndex = Math.round(offsetX / heroPageWidth);

    if (!loops) {
      handleHeroSwipe(scrollIndex);
      return;
    }

    if (scrollIndex === 0) {
      skipNextHeroScroll.current = true;
      heroScrollRef.current?.scrollTo({
        x: photos.length * heroPageWidth,
        animated: false,
      });
      onActiveIdChange(photos[photos.length - 1].id);
      return;
    }

    if (scrollIndex === carouselPhotos.length - 1) {
      skipNextHeroScroll.current = true;
      heroScrollRef.current?.scrollTo({
        x: heroPageWidth,
        animated: false,
      });
      onActiveIdChange(photos[0].id);
      return;
    }

    handleHeroSwipe(scrollIndex - 1);
  }

  if (photos.length === 0) return null;

  const dots =
    photos.length > 1 ? (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          marginTop: dotsPosition === 'below' ? 8 : 0,
          marginBottom: dotsPosition === 'above' ? 8 : 0,
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
    ) : null;

  return (
    <View
      style={{ marginBottom: 12 }}
      onLayout={(e) => setHeroPageWidth(e.nativeEvent.layout.width)}
    >
      {dotsPosition === 'above' ? dots : null}

      <ScrollView
        ref={heroScrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => {
          const velocityX = e.nativeEvent.velocity?.x ?? 0;
          if (Math.abs(velocityX) < 0.05) {
            handleScrollEnd(e.nativeEvent.contentOffset.x);
          }
        }}
      >
        {carouselPhotos.map((photo, index) => (
          <Pressable
            key={loops ? `${photo.id}-${index}` : photo.id}
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
                borderRadius: 2,
                backgroundColor: colors.photoPlaceholder,
              }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {dotsPosition === 'below' ? dots : null}
    </View>
  );
}
