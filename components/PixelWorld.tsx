import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Sprite } from '@/components/PixelConstruction';
import { type CityBuilding, useTasks } from '@/context/TaskContext';

const PX = 6;
// Ground plane starts at this fraction of screen height.
export const HORIZON = 0.62;

export type DayPhase = 'morning' | 'day' | 'sunset' | 'night';

export function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  return 'night';
}

type PhaseTheme = {
  skyBands: string[]; // top -> horizon, pixel-game banded sky
  groundBands: string[]; // horizon -> bottom
  silhouetteBack: string;
  silhouetteFront: string;
  windowLit: string;
  showStars: boolean;
  showClouds: boolean;
  cloudColor: string;
};

// Menacing storm used during exam boss battles, regardless of time of day.
const BOSS_STORM: PhaseTheme = {
  skyBands: ['#12041F', '#1F0733', '#360B3F', '#521026'],
  groundBands: ['#2E1B24', '#271620', '#20121B', '#1A0E16', '#140A11'],
  silhouetteBack: 'rgba(30,10,40,0.7)',
  silhouetteFront: 'rgba(15,5,22,0.85)',
  windowLit: 'rgba(239,68,68,0.55)',
  showStars: true,
  showClouds: false,
  cloudColor: 'rgba(88,28,135,0.4)',
};

const PHASES: Record<DayPhase, PhaseTheme> = {
  morning: {
    skyBands: ['#7EC8E3', '#94D4EC', '#B3E2F2', '#FBE7A2'],
    groundBands: ['#C9A227', '#B08968', '#9C7653', '#8A6543', '#775636'],
    silhouetteBack: 'rgba(96,125,139,0.35)',
    silhouetteFront: 'rgba(69,90,100,0.5)',
    windowLit: 'rgba(255,255,255,0.35)',
    showStars: false,
    showClouds: true,
    cloudColor: 'rgba(255,255,255,0.92)',
  },
  day: {
    skyBands: ['#3F97DC', '#55A7E4', '#74BAEC', '#9ED2F4'],
    groundBands: ['#C2924E', '#B08968', '#9C7653', '#8A6543', '#775636'],
    silhouetteBack: 'rgba(84,110,122,0.4)',
    silhouetteFront: 'rgba(55,71,79,0.55)',
    windowLit: 'rgba(255,255,255,0.3)',
    showStars: false,
    showClouds: true,
    cloudColor: 'rgba(255,255,255,0.95)',
  },
  sunset: {
    skyBands: ['#3B2F63', '#7C4A8C', '#C96C7B', '#F8A45C'],
    groundBands: ['#8E6B3E', '#7D5C36', '#6D4F2E', '#5D4327', '#4E3820'],
    silhouetteBack: 'rgba(43,33,73,0.55)',
    silhouetteFront: 'rgba(30,22,54,0.7)',
    windowLit: 'rgba(253,230,138,0.75)',
    showStars: true,
    showClouds: true,
    cloudColor: 'rgba(255,214,165,0.75)',
  },
  night: {
    skyBands: ['#0B1026', '#111736', '#1A2344', '#232B52'],
    groundBands: ['#4A3B28', '#3F3222', '#352A1D', '#2B2218', '#221B13'],
    silhouetteBack: 'rgba(51,65,85,0.5)',
    silhouetteFront: 'rgba(15,23,42,0.8)',
    windowLit: 'rgba(253,230,138,0.9)',
    showStars: true,
    showClouds: false,
    cloudColor: 'rgba(148,163,184,0.25)',
  },
};

const SUN = [
  '..YYYY..',
  '.YYYYYY.',
  'YYYYYYYY',
  'YYYYYYYY',
  'YYYYYYYY',
  'YYYYYYYY',
  '.YYYYYY.',
  '..YYYY..',
];

const MOON = [
  '.MMM.',
  'MMMMm',
  'MMMMm',
  'MMMmm',
  '.mmm.',
];

const CLOUD = [
  '...VVVV.....',
  '.VVVVVVVV...',
  'VVVVVVVVVVVV',
  '.VVVVVVVVV..',
];

function PhaseSprite({ rows, px, colors }: { rows: string[]; px: number; colors: Record<string, string> }) {
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
                  backgroundColor: run.ch === '.' ? 'transparent' : colors[run.ch],
                }}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function DriftingCloud({ delaySeed, top, width, color, reducedMotion }: {
  delaySeed: number;
  top: number;
  width: number;
  color: string;
  reducedMotion?: boolean;
}) {
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const anim = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 60000 + delaySeed * 15000, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [x, delaySeed, reducedMotion]);

  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: [-90 + delaySeed * 60, width + 90],
  });

  return (
    <Animated.View style={{ position: 'absolute', top, transform: [{ translateX }] }}>
      <PhaseSprite rows={CLOUD} px={PX} colors={{ V: color }} />
    </Animated.View>
  );
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Building = {
  x: number;
  width: number;
  height: number;
  windows: { x: number; y: number }[];
};

/**
 * Turns the buildings the user earned into a silhouette skyline: same seed,
 * same proportions as the city panel, laid out oldest-first from the left.
 * Whatever street is left over gets filled with modest generic rooftops.
 */
export function cityToSkyline(cityList: CityBuilding[], screenWidth: number, unit: number, withWindows: boolean): Building[] {
  const out: Building[] = [];
  let x = unit;
  for (const b of cityList) {
    if (x > screenWidth + unit * 2) break;
    const rand = seededRandom(b.seed);
    const widthUnits = 7 + Math.floor(rand() * 4);
    const heightUnits = 4 + b.size * 4 + Math.floor(rand() * 3);
    const windows: Building['windows'] = [];
    if (withWindows) {
      for (let wy = 1; wy < heightUnits - 1; wy += 3) {
        for (let wx = 1; wx < widthUnits - 1; wx += 3) {
          if (rand() < 0.3) windows.push({ x: wx * unit, y: wy * unit });
        }
      }
    }
    out.push({ x, width: widthUnits * unit, height: heightUnits * unit, windows });
    x += (widthUnits + 2) * unit;
  }
  const filler = seededRandom(777);
  while (x < screenWidth + unit * 2) {
    const widthUnits = 5 + Math.floor(filler() * 4);
    const heightUnits = 3 + Math.floor(filler() * 4);
    out.push({ x, width: widthUnits * unit, height: heightUnits * unit, windows: [] });
    x += (widthUnits + 1 + Math.floor(filler() * 2)) * unit;
  }
  return out;
}

function generateSkyline(screenWidth: number, seed: number, minH: number, maxH: number, withWindows: boolean): Building[] {
  const rand = seededRandom(seed);
  const buildings: Building[] = [];
  let x = -PX * 2;
  while (x < screenWidth + PX * 2) {
    const widthUnits = 4 + Math.floor(rand() * 5);
    const heightUnits = minH + Math.floor(rand() * (maxH - minH));
    const width = widthUnits * PX;
    const height = heightUnits * PX;
    const windows: Building['windows'] = [];
    if (withWindows) {
      for (let wy = 1; wy < heightUnits - 1; wy += 2) {
        for (let wx = 1; wx < widthUnits - 1; wx += 2) {
          if (rand() < 0.4) windows.push({ x: wx * PX, y: wy * PX });
        }
      }
    }
    buildings.push({ x, width, height, windows });
    x += width + PX * (1 + Math.floor(rand() * 2));
  }
  return buildings;
}

const CRANE_COLOR = 'rgba(100,116,139,0.75)';

function PixelCrane({ left, bottom }: { left: number; bottom: number }) {
  return (
    <View style={{ position: 'absolute', left, bottom, width: PX * 16, height: PX * 15 }}>
      <View style={{ position: 'absolute', left: PX * 6, bottom: 0, width: PX, height: PX * 14, backgroundColor: CRANE_COLOR }} />
      <View style={{ position: 'absolute', left: PX * 7, bottom: 0, width: PX, height: PX * 14, backgroundColor: CRANE_COLOR, opacity: 0.6 }} />
      <View style={{ position: 'absolute', left: 0, bottom: PX * 14, width: PX * 16, height: PX, backgroundColor: CRANE_COLOR }} />
      <View style={{ position: 'absolute', left: 0, bottom: PX * 13, width: PX * 3, height: PX, backgroundColor: CRANE_COLOR }} />
      <View style={{ position: 'absolute', left: PX * 13, bottom: PX * 10, width: 1, height: PX * 4, backgroundColor: CRANE_COLOR }} />
      <View style={{ position: 'absolute', left: PX * 12.5, bottom: PX * 9, width: PX, height: PX, backgroundColor: CRANE_COLOR }} />
    </View>
  );
}

const BARRIER = [
  'OVVOOVVO',
  'OVVOOVVO',
  '.k....k.',
];

/**
 * Compact in-flow sky header for regular screens: time-of-day banded sky,
 * sun/moon, stars, and a mini skyline along the bottom edge. Children render
 * on top of the sky.
 */
export function PixelSkyStrip({ height = 150, style, children }: {
  height?: number;
  style?: object;
  children?: ReactNode;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const { city } = useTasks();
  const [width, setWidth] = useState(windowWidth);
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase(new Date().getHours()));

  useEffect(() => {
    const t = setInterval(() => setPhase(getDayPhase(new Date().getHours())), 60000);
    return () => clearInterval(t);
  }, []);

  const theme = PHASES[phase];
  const bandH = height / theme.skyBands.length;

  const skyline = useMemo(
    () => city.length > 0 ? cityToSkyline(city, width, 3, true) : generateSkyline(width, 21, 3, 7, false),
    [city, width],
  );
  const stars = useMemo(() => {
    const rand = seededRandom(55);
    return Array.from({ length: 14 }, () => ({
      x: rand() * width,
      y: rand() * height * 0.6,
      dim: rand() < 0.5,
    }));
  }, [width, height]);

  return (
    <View
      style={[{ height, overflow: 'hidden' }, style]}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="box-none"
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {theme.skyBands.map((c, i) => (
          <View key={i} style={{ position: 'absolute', top: i * bandH, left: 0, right: 0, height: bandH + 1, backgroundColor: c }} />
        ))}
        {theme.showStars && stars.map((s, i) => (
          <View
            key={`s${i}`}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.dim ? 2 : 3,
              height: s.dim ? 2 : 3,
              backgroundColor: s.dim ? 'rgba(148,163,184,0.4)' : 'rgba(203,213,225,0.8)',
            }}
          />
        ))}
        {phase === 'night' ? (
          <View style={{ position: 'absolute', top: 16, right: 28 }}>
            <PhaseSprite rows={MOON} px={4} colors={{ M: '#E2E8F0', m: '#CBD5E1' }} />
          </View>
        ) : (
          <View style={{ position: 'absolute', top: phase === 'day' ? 12 : height - 76, right: 30 }}>
            <PhaseSprite
              rows={SUN}
              px={4}
              colors={{ Y: phase === 'sunset' ? '#FB923C' : phase === 'morning' ? '#FDE68A' : '#FDE047' }}
            />
          </View>
        )}
        {skyline.map((b, i) => (
          <View
            key={`b${i}`}
            style={{
              position: 'absolute',
              left: b.x,
              bottom: 0,
              width: b.width,
              height: b.height,
              backgroundColor: theme.silhouetteFront,
            }}
          >
            {b.windows.map((w, wi) => (
              <View
                key={wi}
                style={{
                  position: 'absolute',
                  left: w.x,
                  bottom: w.y,
                  width: 3,
                  height: 3,
                  backgroundColor: theme.windowLit,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

export default function PixelWorld({ reducedMotion, boss }: { reducedMotion?: boolean; boss?: boolean }) {
  const { width, height } = useWindowDimensions();
  const { city } = useTasks();
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase(new Date().getHours()));
  const [lightning, setLightning] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPhase(getDayPhase(new Date().getHours())), 60000);
    return () => clearInterval(t);
  }, []);

  // Occasional lightning flashes while a boss battle rages.
  useEffect(() => {
    if (!boss || reducedMotion) return;
    let flashTimeout: ReturnType<typeof setTimeout> | null = null;
    const strike = setInterval(() => {
      setLightning(true);
      flashTimeout = setTimeout(() => setLightning(false), 110);
    }, 4200 + Math.random() * 2600);
    return () => {
      clearInterval(strike);
      if (flashTimeout) clearTimeout(flashTimeout);
      setLightning(false);
    };
  }, [boss, reducedMotion]);

  const theme = boss ? BOSS_STORM : PHASES[phase];
  const horizonY = height * HORIZON;
  const skyBandH = horizonY / theme.skyBands.length;
  const groundH = height - horizonY;
  const groundBandH = groundH / theme.groundBands.length;

  const backRow = useMemo(() => generateSkyline(width, 7, 8, 16, false), [width]);
  const frontRow = useMemo(
    () => city.length > 0 ? cityToSkyline(city, width, 4, true) : generateSkyline(width, 42, 4, 10, true),
    [city, width],
  );

  const stars = useMemo(() => {
    const rand = seededRandom(99);
    return Array.from({ length: 40 }, () => ({
      x: rand() * width,
      y: rand() * horizonY * 0.75,
      dim: rand() < 0.5,
    }));
  }, [width, horizonY]);

  const speckles = useMemo(() => {
    const rand = seededRandom(77);
    return Array.from({ length: 34 }, () => ({
      x: rand() * width,
      y: horizonY + 14 + rand() * (groundH - 30),
      light: rand() < 0.5,
    }));
  }, [width, horizonY, groundH]);

  const barrierCount = Math.ceil(width / 90);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Banded sky */}
      {theme.skyBands.map((c, i) => (
        <View key={`sky${i}`} style={{ position: 'absolute', top: i * skyBandH, left: 0, right: 0, height: skyBandH + 1, backgroundColor: c }} />
      ))}

      {/* Stars */}
      {theme.showStars && stars.map((s, i) => (
        <View
          key={`st${i}`}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.dim ? 2 : 3,
            height: s.dim ? 2 : 3,
            backgroundColor: s.dim ? 'rgba(148,163,184,0.4)' : 'rgba(203,213,225,0.8)',
          }}
        />
      ))}

      {/* Sun or moon (blood moon during a boss battle) */}
      {boss ? (
        <View style={{ position: 'absolute', top: 80, right: 44 }}>
          <PhaseSprite rows={MOON} px={PX} colors={{ M: '#EF4444', m: '#B91C1C' }} />
        </View>
      ) : phase === 'night' ? (
        <View style={{ position: 'absolute', top: 80, right: 44 }}>
          <PhaseSprite rows={MOON} px={PX} colors={{ M: '#E2E8F0', m: '#CBD5E1' }} />
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            top: phase === 'day' ? 70 : horizonY - 140,
            right: phase === 'morning' ? undefined : 48,
            left: phase === 'morning' ? 40 : undefined,
          }}
        >
          <PhaseSprite
            rows={SUN}
            px={PX}
            colors={{ Y: phase === 'sunset' ? '#FB923C' : phase === 'morning' ? '#FDE68A' : '#FDE047' }}
          />
        </View>
      )}

      {/* Clouds */}
      {theme.showClouds && (
        <>
          <DriftingCloud delaySeed={0} top={90} width={width} color={theme.cloudColor} reducedMotion={reducedMotion} />
          <DriftingCloud delaySeed={1} top={150} width={width} color={theme.cloudColor} reducedMotion={reducedMotion} />
          <DriftingCloud delaySeed={2} top={50} width={width} color={theme.cloudColor} reducedMotion={reducedMotion} />
        </>
      )}

      {/* Back skyline */}
      {backRow.map((b, i) => (
        <View
          key={`b${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: horizonY - b.height,
            width: b.width,
            height: b.height,
            backgroundColor: theme.silhouetteBack,
          }}
        />
      ))}

      <PixelCrane left={width * 0.66} bottom={height - horizonY} />

      {/* Front skyline with windows */}
      {frontRow.map((b, i) => (
        <View
          key={`f${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: horizonY - b.height,
            width: b.width,
            height: b.height,
            backgroundColor: theme.silhouetteFront,
          }}
        >
          {b.windows.map((w, wi) => (
            <View
              key={wi}
              style={{
                position: 'absolute',
                left: w.x,
                bottom: w.y,
                width: PX,
                height: PX,
                backgroundColor: theme.windowLit,
              }}
            />
          ))}
        </View>
      ))}

      {/* Ground plane, banded for depth */}
      {theme.groundBands.map((c, i) => (
        <View
          key={`g${i}`}
          style={{
            position: 'absolute',
            top: horizonY + i * groundBandH,
            left: 0,
            right: 0,
            height: groundBandH + 1,
            backgroundColor: c,
          }}
        />
      ))}

      {/* Dirt speckles */}
      {speckles.map((s, i) => (
        <View
          key={`sp${i}`}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: PX,
            height: PX / 2,
            backgroundColor: s.light ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)',
          }}
        />
      ))}

      {/* Striped safety barriers along the back of the lot */}
      {Array.from({ length: barrierCount }, (_, i) => (
        <View key={`bar${i}`} style={{ position: 'absolute', left: i * 90 + 12, top: horizonY - 2 }}>
          <PhaseSprite rows={BARRIER} px={3} colors={{ O: '#F97316', V: '#F8FAFC', k: '#1C1917' }} />
        </View>
      ))}

      {/* Lightning flash */}
      {lightning && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(226,232,240,0.22)' }]} />
      )}
    </View>
  );
}
