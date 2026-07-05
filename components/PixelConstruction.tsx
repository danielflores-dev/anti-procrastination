import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

// One character = one pixel. '.' is transparent.
export const PALETTE: Record<string, string> = {
  H: '#FACC15', // hard hat
  h: '#EAB308', // hat shade
  S: '#E8B98A', // skin
  o: '#1F2937', // eyes
  B: '#F97316', // safety vest
  b: '#EA580C', // vest shade
  s: '#FDE047', // vest stripe
  P: '#3B82F6', // pants
  p: '#2563EB', // pants shade
  K: '#292524', // boots
  T: '#94A3B8', // hammer head
  t: '#A16207', // hammer handle
  W: '#B45309', // brick
  w: '#92400E', // brick shade / slab
  G: '#FDE68A', // lit window
  D: '#334155', // dark window
  R: '#DC2626', // roof
  r: '#B91C1C', // roof shade
  F: '#22C55E', // flag
  L: '#64748B', // scaffold steel
  d: '#7C2D12', // door
  k: '#1C1917', // outline
  N: '#CA8A04', // wooden plank
  n: '#A16207', // plank shade
  M: '#CBD5E1', // mixer drum
  m: '#94A3B8', // drum shade
  C: '#57534E', // chassis
  O: '#F97316', // cone orange
  V: '#F8FAFC', // white stripe
};

// Renders a sprite with run-length rows so long same-color stretches are one View.
export function Sprite({ rows, px }: { rows: string[]; px: number }) {
  return (
    <View>
      {rows.map((row, ri) => {
        const runs: { ch: string; len: number }[] = [];
        for (const ch of row) {
          const last = runs[runs.length - 1];
          if (last && last.ch === ch) last.len += 1;
          else runs.push({ ch, len: 1 });
        }
        return (
          <View key={ri} style={{ flexDirection: 'row', height: px }}>
            {runs.map((run, i) => (
              <View
                key={i}
                style={{
                  width: run.len * px,
                  height: px,
                  backgroundColor: run.ch === '.' ? 'transparent' : PALETTE[run.ch],
                }}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const WORKER_UP = [
  '....HHHH..TT',
  '...HHHHHH.TT',
  '...hhhhhh..t',
  '...SSooSS..t',
  '...SSSSSS.St',
  '....SSSS.SS.',
  '..BBBBBBBS..',
  '.BBBBBBBBB..',
  '.BsBBBBssB..',
  '.b.BBBB..b..',
  '...PPPP.....',
  '...PP.PP....',
  '...pp.pp....',
  '..KKK.KKK...',
];

const WORKER_DOWN = [
  '....HHHH....',
  '...HHHHHH...',
  '...hhhhhh...',
  '...SSooSS...',
  '...SSSSSS...',
  '....SSSS....',
  '..BBBBBBB...',
  '.BBBBBBBBSS.',
  '.BsBBBBssStt',
  '.b.BBBB..bTT',
  '...PPPP...TT',
  '...PP.PP....',
  '...pp.pp....',
  '..KKK.KKK...',
];

const WALKER_A = [
  'NNNNNNNNNNNN',
  'nnnnnnnnnnnn',
  '....HHHH....',
  '...HHHHHH...',
  '..SSSooSSS..',
  '..S.SSSS.S..',
  '..BBBBBBBB..',
  '..BsBBBBsB..',
  '...PPPP.....',
  '..PP...PP...',
  '.KK.....KK..',
];

const WALKER_B = [
  'NNNNNNNNNNNN',
  'nnnnnnnnnnnn',
  '....HHHH....',
  '...HHHHHH...',
  '..SSSooSSS..',
  '..S.SSSS.S..',
  '..BBBBBBBB..',
  '..BsBBBBsB..',
  '...PPPP.....',
  '....PPPP....',
  '...KK.KK....',
];

const MIXER = [
  '...MMMMM....',
  '..MMMMMMm...',
  '..MMMMMMm...',
  '...MMMmm....',
  '..CCCCCCC...',
  '..C..C..C...',
  '..K.....K...',
];

const BRICK_PILE = [
  '.WWWW.WWWW',
  'WWWW.WWWW.',
  '.WWWW.WWWW',
  'WWWWWWWWWW',
];

const CONE = [
  '..O..',
  '.OOO.',
  '.VVV.',
  'OOOOO',
];

function mirror(rows: string[]): string[] {
  return rows.map(r => r.split('').reverse().join(''));
}

const BUILDING_WIDTH = 24;
const BUILDING_MAX_ROWS = 16;

// Generates the building top-to-bottom. While unfinished the top row is
// scaffold steel; at 100% it gets a roof and a flag.
function buildRows(revealed: number, complete: boolean): string[] {
  const rows: string[] = [];
  for (let i = revealed - 1; i >= 0; i--) {
    let row = '';
    const isSlab = i % 4 === 3;
    for (let c = 0; c < BUILDING_WIDTH; c++) {
      if (c === 0 || c === BUILDING_WIDTH - 1) {
        row += 'w';
      } else if (i === 0 && c >= 10 && c <= 13) {
        row += c === 10 || c === 13 ? 'k' : 'd';
      } else if (isSlab) {
        row += 'w';
      } else if ((c % 5 === 2 || c % 5 === 3) && c > 1 && c < BUILDING_WIDTH - 2) {
        row += (i + c) % 3 === 0 ? 'G' : 'D';
      } else {
        row += 'W';
      }
    }
    rows.push(row);
  }
  if (!complete && rows.length > 0) {
    rows[0] = 'L'.repeat(BUILDING_WIDTH);
  }
  if (complete) {
    const pad = Math.floor(BUILDING_WIDTH / 2) - 1;
    rows.unshift('.'.repeat(pad + 2) + 'k' + '.'.repeat(BUILDING_WIDTH - pad - 3));
    rows.unshift('.'.repeat(pad) + 'FFk' + '.'.repeat(BUILDING_WIDTH - pad - 3));
    rows.unshift('.'.repeat(pad) + 'FFk' + '.'.repeat(BUILDING_WIDTH - pad - 3));
    rows.splice(3, 0, 'r'.repeat(BUILDING_WIDTH));
    rows.splice(3, 0, 'R'.repeat(BUILDING_WIDTH));
  }
  return rows;
}

type Props = {
  /** 0..1 — how far through the session goal */
  progress: number;
  /** true while the timer is ticking */
  running: boolean;
  reducedMotion?: boolean;
  px?: number;
};

const SCENE_W = 340;
const SCENE_H = 130;

export default function PixelConstruction({ progress, running, reducedMotion, px = 4 }: Props) {
  const [frame, setFrame] = useState(0);
  const frameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const walkX = useRef(new Animated.Value(0)).current;
  const walkAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (running && !reducedMotion) {
      frameTimer.current = setInterval(() => setFrame(f => (f + 1) % 2), 400);
      walkX.setValue(0);
      walkAnim.current = Animated.loop(
        Animated.timing(walkX, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      walkAnim.current.start();
    } else {
      if (frameTimer.current) {
        clearInterval(frameTimer.current);
        frameTimer.current = null;
      }
      walkAnim.current?.stop();
    }
    return () => {
      if (frameTimer.current) clearInterval(frameTimer.current);
      walkAnim.current?.stop();
    };
  }, [running, reducedMotion, walkX]);

  const complete = progress >= 1;
  const revealed = complete
    ? BUILDING_MAX_ROWS
    : Math.max(1, Math.floor(progress * BUILDING_MAX_ROWS));

  const building = buildRows(revealed, complete);
  const buildingW = BUILDING_WIDTH * px;
  const buildingLeft = (SCENE_W - buildingW) / 2;

  const workerLeft = frame === 0 ? WORKER_UP : WORKER_DOWN;
  const workerRight = frame === 0 ? mirror(WORKER_DOWN) : mirror(WORKER_UP);
  const walker = frame === 0 ? WALKER_A : WALKER_B;

  const walkTranslate = walkX.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCENE_W / 2 + 20, SCENE_W / 2 - 40],
  });

  return (
    <View style={{ width: SCENE_W, height: SCENE_H }}>
      {/* Cement mixer, set back-left (higher = farther away) */}
      <View style={{ position: 'absolute', left: 4, bottom: 14 }}>
        <Sprite rows={MIXER} px={px} />
      </View>

      {/* Brick pile, back-right */}
      <View style={{ position: 'absolute', right: 18, bottom: 16 }}>
        <Sprite rows={BRICK_PILE} px={px} />
      </View>

      {/* Building, center */}
      <View style={{ position: 'absolute', left: buildingLeft, bottom: 8 }}>
        <Sprite rows={building} px={px} />
      </View>

      {/* Hammering workers flanking the building */}
      <View style={{ position: 'absolute', left: buildingLeft - 13 * px, bottom: 6 }}>
        <Sprite rows={workerLeft} px={px} />
      </View>
      <View style={{ position: 'absolute', left: buildingLeft + buildingW + px, bottom: 6 }}>
        <Sprite rows={workerRight} px={px} />
      </View>

      {/* Traffic cone, front-right (lower = closer) */}
      <View style={{ position: 'absolute', right: 40, bottom: 0 }}>
        <Sprite rows={CONE} px={px} />
      </View>

      {/* Worker carrying a plank across the front of the site */}
      <Animated.View
        style={{
          position: 'absolute',
          left: SCENE_W / 2 - 6 * px,
          bottom: -6,
          transform: [{ translateX: walkTranslate }],
        }}
      >
        <Sprite rows={walker} px={px} />
      </Animated.View>
    </View>
  );
}
