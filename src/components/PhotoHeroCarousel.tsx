import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from '../textScale';
import { colors } from '../theme';
import type { PhotoHeroLayout } from '../photoHeroLayoutPrefs';

const HERO_ASPECT = 0.78;
const GRID_GAP = 4;
const PAGE_SIZE = 4;

export type HeroPhoto = {
  id: string;
  uri: string;
  label: string;
  /** When true, draw a highlighted frame around this hero cell. */
  favorite?: boolean;
};

export type HeroMoveHandlers = {
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
};

function chunkPhotos(photos: HeroPhoto[], size: number): HeroPhoto[][] {
  const pages: HeroPhoto[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    pages.push(photos.slice(i, i + size));
  }
  return pages;
}

function MoveArrowRow(props: {
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  compact?: boolean;
}) {
  const { onMoveLeft, onMoveRight, compact } = props;
  if (!onMoveLeft && !onMoveRight) return null;
  const fontSize = compact ? 14 : 18;
  const gap = compact ? 10 : 24;
  const spacer = compact ? 20 : 28;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        paddingVertical: compact ? 2 : 6,
        minHeight: compact ? 20 : 28,
      }}
    >
      {onMoveLeft ? (
        <Pressable
          onPress={onMoveLeft}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Move photo left"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: compact ? 4 : 8 })}
        >
          <Text style={{ fontSize, fontWeight: '600', color: colors.primary }}>←</Text>
        </Pressable>
      ) : (
        <View style={{ width: spacer }} />
      )}
      {onMoveRight ? (
        <Pressable
          onPress={onMoveRight}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Move photo right"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: compact ? 4 : 8 })}
        >
          <Text style={{ fontSize, fontWeight: '600', color: colors.primary }}>→</Text>
        </Pressable>
      ) : (
        <View style={{ width: spacer }} />
      )}
    </View>
  );
}

export function PhotoHeroCarousel(props: {
  photos: HeroPhoto[];
  activeId: string | null;
  onActiveIdChange: (id: string) => void;
  /** Opens full-screen viewer; pass photo id when opening a specific cell. */
  onOpenViewer: (photoId?: string) => void;
  layout: PhotoHeroLayout;
  /** Where to show page indicator dots. Default: below the image. */
  dotsPosition?: 'above' | 'below';
  /** How the hero image fills its frame. Default: cover (may crop). */
  resizeMode?: 'cover' | 'contain';
  /** When true, show move controls (1-up bar / 4-up per cell). */
  showReorderArrows?: boolean;
  /** Where the 1-up ← → bar sits relative to the image. */
  reorderBarPlacement?: 'above' | 'below';
  getMoveHandlers?: (photoId: string) => HeroMoveHandlers;
}) {
  const {
    photos,
    activeId,
    onActiveIdChange,
    onOpenViewer,
    layout,
    dotsPosition = 'below',
    resizeMode = 'cover',
    showReorderArrows = false,
    reorderBarPlacement = 'below',
    getMoveHandlers,
  } = props;
  const { width: windowWidth } = useWindowDimensions();
  const heroScrollRef = useRef<ScrollView>(null);
  const skipNextHeroScroll = useRef(false);
  const isInitialHeroScroll = useRef(true);
  const [heroPageWidth, setHeroPageWidth] = useState(Math.max(windowWidth - 32, 1));
  const heroHeight = Math.round(heroPageWidth * HERO_ASPECT);
  const isFourUp = layout === '4';

  const pages = useMemo(
    () => (isFourUp ? chunkPhotos(photos, PAGE_SIZE) : photos.map((photo) => [photo])),
    [isFourUp, photos]
  );

  const loops = pages.length > 1;

  const carouselPages = useMemo(() => {
    if (!loops) return pages;
    return [pages[pages.length - 1], ...pages, pages[0]];
  }, [loops, pages]);

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

  const activePageIndex = useMemo(() => {
    if (!isFourUp) return activeIndex;
    return Math.floor(activeIndex / PAGE_SIZE);
  }, [activeIndex, isFourUp]);

  const photoIds = photos.map((photo) => photo.id).join(',');

  useEffect(() => {
    isInitialHeroScroll.current = true;
  }, [photoIds, layout]);

  useEffect(() => {
    if (heroPageWidth <= 0 || pages.length === 0) return;
    if (skipNextHeroScroll.current) {
      skipNextHeroScroll.current = false;
      return;
    }
    const scrollIndex = loops ? activePageIndex + 1 : activePageIndex;
    heroScrollRef.current?.scrollTo({
      x: scrollIndex * heroPageWidth,
      animated: !isInitialHeroScroll.current,
    });
    isInitialHeroScroll.current = false;
  }, [activePageIndex, heroPageWidth, pages.length, loops, layout]);

  function handlePageSwipe(pageIndex: number) {
    const page = pages[pageIndex];
    const first = page?.[0];
    if (first && first.id !== effectiveActiveId) {
      skipNextHeroScroll.current = true;
      onActiveIdChange(first.id);
    }
  }

  function handleScrollEnd(offsetX: number) {
    if (heroPageWidth <= 0) return;
    const scrollIndex = Math.round(offsetX / heroPageWidth);

    if (!loops) {
      handlePageSwipe(scrollIndex);
      return;
    }

    if (scrollIndex === 0) {
      skipNextHeroScroll.current = true;
      heroScrollRef.current?.scrollTo({
        x: pages.length * heroPageWidth,
        animated: false,
      });
      const lastPage = pages[pages.length - 1];
      const lastFirst = lastPage?.[0];
      if (lastFirst) onActiveIdChange(lastFirst.id);
      return;
    }

    if (scrollIndex === carouselPages.length - 1) {
      skipNextHeroScroll.current = true;
      heroScrollRef.current?.scrollTo({
        x: heroPageWidth,
        animated: false,
      });
      const first = pages[0]?.[0];
      if (first) onActiveIdChange(first.id);
      return;
    }

    handlePageSwipe(scrollIndex - 1);
  }

  if (photos.length === 0) return null;

  const cellLabelHeight = isFourUp ? 16 : 0;
  const imageWidth = isFourUp ? (heroPageWidth - GRID_GAP) / 2 : heroPageWidth;
  const imageHeight = isFourUp ? (heroHeight - GRID_GAP) / 2 : heroHeight;
  const cellWidth = imageWidth;
  const cellHeight = imageHeight + cellLabelHeight;
  const pageHeight = isFourUp ? cellHeight * 2 + GRID_GAP : heroHeight;

  const activeMove =
    showReorderArrows && !isFourUp && effectiveActiveId && getMoveHandlers
      ? getMoveHandlers(effectiveActiveId)
      : undefined;
  const showOneUpReorderBar = Boolean(
    activeMove && (activeMove.onMoveLeft || activeMove.onMoveRight)
  );
  const oneUpReorderBar = showOneUpReorderBar ? (
    <MoveArrowRow onMoveLeft={activeMove?.onMoveLeft} onMoveRight={activeMove?.onMoveRight} />
  ) : null;

  const dots =
    pages.length > 1 ? (
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
        accessibilityLabel={
          isFourUp
            ? `Page ${activePageIndex + 1} of ${pages.length}`
            : `Photo ${activeIndex + 1} of ${photos.length}`
        }
      >
        {pages.map((page, index) => (
          <View
            key={page[0]?.id ?? `page-${index}`}
            style={{
              width: index === activePageIndex ? 8 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: index === activePageIndex ? colors.primary : colors.border,
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

      {reorderBarPlacement === 'above' ? oneUpReorderBar : null}

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
        {carouselPages.map((page, pageScrollIndex) => (
          <View
            key={
              loops
                ? `page-${pageScrollIndex}-${page[0]?.id ?? 'empty'}`
                : `page-${page[0]?.id ?? pageScrollIndex}`
            }
            style={{
              width: heroPageWidth,
              height: pageHeight,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: isFourUp ? GRID_GAP : 0,
              borderRadius: isFourUp ? 0 : 12,
              overflow: 'hidden',
            }}
          >
            {page.map((photo) => {
              const move =
                showReorderArrows && isFourUp && getMoveHandlers
                  ? getMoveHandlers(photo.id)
                  : undefined;
              const showCellMove = Boolean(move?.onMoveLeft || move?.onMoveRight);
              const trimmed = photo.label?.trim();
              const cellLabel =
                isFourUp && trimmed && trimmed !== 'Photo' ? trimmed : undefined;
              return (
                <View
                  key={photo.id}
                  style={{
                    width: cellWidth,
                    height: cellHeight,
                  }}
                >
                  <View
                    style={{
                      width: imageWidth,
                      height: imageHeight,
                      position: 'relative',
                      borderRadius: isFourUp ? 8 : 12,
                      overflow: 'hidden',
                      borderWidth: 2.5,
                      borderColor:
                        photo.favorite === true ? colors.primary : 'transparent',
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        onActiveIdChange(photo.id);
                        onOpenViewer(photo.id);
                      }}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={photo.label}
                      accessibilityHint={
                        isFourUp
                          ? 'Tap to open full screen. Swipe for previous or next page.'
                          : 'Swipe for previous or next photo. Tap to open full screen.'
                      }
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Image
                        source={{ uri: photo.uri }}
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: colors.photoPlaceholder,
                        }}
                        resizeMode={resizeMode}
                      />
                    </Pressable>
                    {showCellMove ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(255,255,255,0.82)',
                          borderBottomLeftRadius: 8,
                          borderBottomRightRadius: 8,
                        }}
                      >
                        <MoveArrowRow
                          onMoveLeft={move?.onMoveLeft}
                          onMoveRight={move?.onMoveRight}
                          compact
                        />
                      </View>
                    ) : null}
                  </View>
                  {isFourUp ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        fontWeight: '600',
                        color: colors.textMuted,
                        textAlign: 'center',
                        height: cellLabelHeight - 2,
                      }}
                    >
                      {cellLabel ?? ' '}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {reorderBarPlacement === 'below' ? oneUpReorderBar : null}

      {dotsPosition === 'below' ? dots : null}
    </View>
  );
}
