import {
  PALETTE,
  Sprite,
  WORKER_CHEER_A,
  WORKER_CHEER_B,
  WORKER_DOWN,
  WORKER_UP,
} from '@/components/PixelConstruction';
import { PIXEL_FONT } from '@/components/pixel-ui';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Boss colors layered on top of the shared palette.
const BOSS_PALETTE: Record<string, string> = {
  ...PALETTE,
  U: '#7C3AED', // boss body
  u: '#5B21B6', // body shade
  R: '#EF4444', // glowing eyes
  V: '#F8FAFC', // teeth and claws
  k: '#1C1917', // outline
};

const HP_RED = '#EF4444';

// 20px-wide horned monster, two frames: brooding and lunging.
const BOSS_IDLE = [
  '..kk............kk..',
  '.kUUk..........kUUk.',
  '..kUUk........kUUk..',
  '...kUUkkkkkkkkUUk...',
  '...kUUUUUUUUUUUUk...',
  '..kUUUUUUUUUUUUUUk..',
  '..kURRkUUUUUUkRRUk..',
  '..kURRkUUUUUUkRRUk..',
  '..kUUUUUUUUUUUUUUk..',
  '..kUkVkVkVkVkVkUUk..',
  '..kUUUUUUUUUUUUUUk..',
  '...kuUUUUUUUUUUuk...',
  '..kUUk.kuUUuk.kUUk..',
  '.kUUk...kuuk...kUUk.',
  '.kVk....kuuk....kVk.',
  '........kkkk........',
];

const BOSS_LUNGE = [
  '..kk............kk..',
  '.kUUk..........kUUk.',
  '..kUUk........kUUk..',
  '...kUUkkkkkkkkUUk...',
  '...kUUUUUUUUUUUUk...',
  '.kkUUUUUUUUUUUUUUkk.',
  'kURRRkUUUUUUUUkRRRUk',
  'kURRRkUUUUUUUUkRRRUk',
  '.kUUUUUUUUUUUUUUUUk.',
  '..kUkVkVkVkVkVkUUk..',
  '..kUkkkkkkkkkkkUUk..',
  '...kuUUUUUUUUUUuk...',
  '.kUUk..kuUUuk..kUUk.',
  'kUUk....kuuk....kUUk',
  'kVk.....kuuk.....kVk',
  '........kkkk........',
];

// Flat on its back, tongue out.
const BOSS_DEFEATED = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..kkkkkkkkkkkkkkkk..',
  '.kUUkRkUUUUUUkRkUUk.',
  '.kUUUUUUUUUUUUUUUUk.',
  '.kUUUUUUVVUUUUUUUUk.',
  '..kkkkkkkkkkkkkkkk..',
  '....................',
];

type Props = {
  /** 0..1 — boss HP drains as this rises */
  progress: number;
  running: boolean;
  reducedMotion?: boolean;
  px?: number;
};

const SCENE_W = 340;
const SCENE_H = 150;
const HP_SEGMENTS = 10;

export default function PixelBoss({ progress, running, reducedMotion, px = 5 }: Props) {
  const [frame, setFrame] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const frameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hitTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const defeated = progress >= 1;

  useEffect(() => {
    if (running && !reducedMotion && !defeated) {
      frameTimer.current = setInterval(() => setFrame(f => (f + 1) % 2), 520);
      // The boss takes a visible hit every few seconds while you study.
      hitTimer.current = setInterval(() => {
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 130);
      }, 2600);
    } else {
      if (frameTimer.current) clearInterval(frameTimer.current);
      if (hitTimer.current) clearInterval(hitTimer.current);
      frameTimer.current = null;
      hitTimer.current = null;
    }
    return () => {
      if (frameTimer.current) clearInterval(frameTimer.current);
      if (hitTimer.current) clearInterval(hitTimer.current);
    };
  }, [running, reducedMotion, defeated]);

  const hpLeft = Math.max(0, 1 - progress);
  const filledSegments = defeated ? 0 : Math.max(1, Math.ceil(hpLeft * HP_SEGMENTS));

  const worker = defeated
    ? (frame === 0 ? WORKER_CHEER_A : WORKER_CHEER_B)
    : (frame === 0 ? WORKER_UP : WORKER_DOWN);
  const boss = defeated ? BOSS_DEFEATED : frame === 0 ? BOSS_IDLE : BOSS_LUNGE;

  return (
    <View style={{ width: SCENE_W, height: SCENE_H }}>
      {/* Boss HP bar */}
      <View style={styles.hpWrap}>
        <Text style={styles.hpLabel}>{defeated ? 'Exam defeated!' : 'Exam boss'}</Text>
        <View style={styles.hpBar}>
          {Array.from({ length: HP_SEGMENTS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.hpSegment,
                { backgroundColor: i < filledSegments ? HP_RED : 'rgba(255,255,255,0.08)' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Your fighter, hammer swinging */}
      <View style={{ position: 'absolute', left: 24, bottom: 0 }}>
        <Sprite rows={worker} px={px} />
      </View>

      {/* The boss */}
      <View style={{ position: 'absolute', right: 16, bottom: 0, opacity: hitFlash ? 0.45 : 1 }}>
        <Sprite rows={boss} px={px} palette={BOSS_PALETTE} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hpWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 5,
  },
  hpLabel: {
    color: HP_RED,
    fontSize: 11,
    fontFamily: PIXEL_FONT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  hpBar: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    borderRadius: 3,
    width: 220,
  },
  hpSegment: {
    flex: 1,
    height: 10,
  },
});
