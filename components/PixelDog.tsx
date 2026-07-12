import { PALETTE, Sprite } from '@/components/PixelConstruction';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

// Dog colors on top of the shared palette (N/n are already warm browns).
const DOG_PALETTE: Record<string, string> = {
  ...PALETTE,
  g: '#F472B6', // tongue
};

// 15px-wide pup facing the site. Tail up...
const DOG_HAPPY_A = [
  '............kk.',
  '.N.........kNNk',
  '.N.......kNNNNk',
  '..N......kNoNVk',
  '..NkNNNNNNNNNk.',
  '...kNNNNNNNNNk.',
  '...kNNNNNNNNk..',
  '...kNk....kNk..',
  '...kk.....kk...',
];

// ...and tail down mid-wag.
const DOG_HAPPY_B = [
  '............kk.',
  '...........kNNk',
  '.........kNNNNk',
  '.........kNoNVk',
  'N..kNNNNNNNNNk.',
  '.N.kNNNNNNNNNk.',
  '...kNNNNNNNNk..',
  '...kNk....kNk..',
  '...kk.....kk...',
];

// Head low, tail flat, no perked ear: the streak is broken.
const DOG_SAD = [
  '...............',
  '...............',
  '..........kNNNk',
  'N.........kNoNk',
  '.NkNNNNNNNNNNk.',
  '..kNNNNNNNNNk..',
  '..kNNNNNNNNk...',
  '..kNk....kNk...',
  '..kk.....kk....',
];

// Goal reached: tongue out, bouncing.
const DOG_PARTY_A = [
  '............kk.',
  '.N.........kNNk',
  '.N.......kNNNNk',
  '..N......kNoNVk',
  '..NkNNNNNNNNNkg',
  '...kNNNNNNNNNk.',
  '...kNNNNNNNNk..',
  '...kNk....kNk..',
  '...kk.....kk...',
];

const DOG_PARTY_B = [
  '............kk.',
  '...........kNNk',
  '.........kNNNNk',
  '.........kNoNVk',
  'N..kNNNNNNNNNkg',
  '.N.kNNNNNNNNNk.',
  '...kNNNNNNNNk..',
  '...kNk....kNk..',
  '...kk.....kk...',
];

export type DogMood = 'happy' | 'sad' | 'party';

type Props = {
  mood: DogMood;
  running: boolean;
  reducedMotion?: boolean;
  px?: number;
};

/**
 * The site dog. Wags along while you study, mopes when the streak is broken,
 * and bounces with its tongue out when the goal is hit.
 */
export default function PixelDog({ mood, running, reducedMotion, px = 4 }: Props) {
  const [frame, setFrame] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && !reducedMotion && mood !== 'sad') {
      timer.current = setInterval(() => setFrame(f => (f + 1) % 2), mood === 'party' ? 300 : 450);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, reducedMotion, mood]);

  const rows =
    mood === 'sad' ? DOG_SAD :
    mood === 'party'
      ? (frame === 0 ? DOG_PARTY_A : DOG_PARTY_B)
      : (frame === 0 ? DOG_HAPPY_A : DOG_HAPPY_B);

  // The party bounce lifts the whole pup off the ground every other frame.
  const bounce = mood === 'party' && frame === 0 ? 6 : 0;

  return (
    <View style={{ marginBottom: bounce }}>
      <Sprite rows={rows} px={px} palette={DOG_PALETTE} />
    </View>
  );
}
