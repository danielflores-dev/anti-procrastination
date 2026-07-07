import { PIXEL_FONT } from '@/components/pixel-ui';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const COLORS = ['#F59E0B', '#22C55E', '#EC4899', '#3B82F6', '#F8FAFC', '#FB923C'];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Props = {
  /** Called once when the burst finishes. */
  onDone?: () => void;
  message?: string;
  durationMs?: number;
};

/**
 * One-shot pixel confetti burst: hard-edged squares spray out from the upper
 * middle of the screen and tumble down, with a big message flashing in the
 * center. All pieces are driven by a single native-driver animation.
 */
export default function PixelConfettiBurst({ onDone, message = 'Saved!', durationMs = 1500 }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(() => {
    const rand = seededRandom((Date.now() % 100000) + 7);
    return Array.from({ length: 36 }, () => ({
      startX: width / 2 + (rand() - 0.5) * 90,
      driftX: (rand() - 0.5) * width * 0.9,
      startY: height * 0.3 - rand() * 70,
      endY: height * 0.5 + rand() * height * 0.45,
      size: 4 + Math.floor(rand() * 5),
      color: COLORS[Math.floor(rand() * COLORS.length)],
      spin: (rand() - 0.5) * 720,
      holdBack: rand() * 0.22,
    }));
  }, [width, height]);

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone?.();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messageOpacity = progress.interpolate({
    inputRange: [0, 0.12, 0.75, 1],
    outputRange: [0, 1, 1, 0],
  });
  const messageScale = progress.interpolate({
    inputRange: [0, 0.14, 1],
    outputRange: [0.5, 1, 1],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateY = progress.interpolate({
          inputRange: [0, p.holdBack, 1],
          outputRange: [p.startY, p.startY, p.endY],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [p.startX, p.startX + p.driftX],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spin}deg`],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}

      <View style={styles.messageWrap} pointerEvents="none">
        <Animated.Text
          style={[styles.message, { opacity: messageOpacity, transform: [{ scale: messageScale }] }]}
        >
          {message}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#F59E0B',
    fontSize: 34,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
});
