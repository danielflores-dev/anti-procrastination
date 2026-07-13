import { Sprite } from '@/components/PixelConstruction';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';

const BIRD_PALETTE: Record<string, string> = {
  b: '#94A3B8',
  k: '#64748B',
};

const FLAP_UP = [
  '..b....',
  '.bbb...',
  'bbbbkkk',
  '...bb..',
  '.......',
];

const FLAP_DOWN = [
  '.......',
  '.......',
  'bbbbkkk',
  '.bbbb..',
  '..b....',
];

type Props = {
  running: boolean;
  reducedMotion?: boolean;
};

/**
 * A pigeon that occasionally crosses the sky during a focus session.
 * Unannounced: it shows up every minute or two, flaps across, and is gone.
 */
export default function PixelBird({ running, reducedMotion }: Props) {
  const { width } = useWindowDimensions();
  const [flying, setFlying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [flightTop, setFlightTop] = useState(110);
  const x = useRef(new Animated.Value(0)).current;
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flapRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || reducedMotion) {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      if (flapRef.current) clearInterval(flapRef.current);
      setFlying(false);
      return;
    }

    let cancelled = false;

    const scheduleNext = () => {
      const delay = 50000 + Math.random() * 80000; // every ~50s-130s
      scheduleRef.current = setTimeout(() => {
        if (cancelled) return;
        setFlightTop(80 + Math.random() * 90);
        setFlying(true);
        x.setValue(0);
        flapRef.current = setInterval(() => setFrame(f => (f + 1) % 2), 200);
        Animated.timing(x, {
          toValue: 1,
          duration: 6500,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (flapRef.current) clearInterval(flapRef.current);
          setFlying(false);
          if (finished && !cancelled) scheduleNext();
        });
      }, delay);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      if (flapRef.current) clearInterval(flapRef.current);
    };
  }, [running, reducedMotion, x]);

  if (!flying) return null;

  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, width + 40],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: flightTop, left: 0, transform: [{ translateX }] }}
    >
      <Sprite rows={frame === 0 ? FLAP_UP : FLAP_DOWN} px={4} palette={BIRD_PALETTE} />
    </Animated.View>
  );
}
