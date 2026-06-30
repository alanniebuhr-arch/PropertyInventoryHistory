import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 48;

type Props = {
  uri: string;
  width: number;
  height: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

function clampScale(value: number): number {
  'worklet';
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

export function ZoomablePhotoImage({ uri, width, height, onSwipeLeft, onSwipeRight }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      'worklet';
      scale.value = clampScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= MIN_SCALE) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      'worklet';
      if (scale.value > MIN_SCALE) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (scale.value > MIN_SCALE) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      if (event.translationX <= -SWIPE_THRESHOLD && onSwipeLeft) {
        runOnJS(onSwipeLeft)();
        return;
      }
      if (event.translationX >= SWIPE_THRESHOLD && onSwipeRight) {
        runOnJS(onSwipeRight)();
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.stage, { width, height }]}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, { width, height }, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
