import { cityToSkyline } from '@/components/PixelWorld';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { useTasks } from '@/context/TaskContext';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

// Deterministic so the pattern doesn't reshuffle on re-render.
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Subtle full-screen decoration behind menu screens: scattered pixel dust
 * tinted with the school color, and a faint city silhouette with a few lit
 * windows along the bottom. Static and non-interactive so it never competes
 * with the content on top of it.
 */
export default function PixelBackdrop() {
  const { width, height } = useWindowDimensions();
  const { theme } = useSchoolTheme();
  const { city } = useTasks();

  const speckles = useMemo(() => {
    const rand = seededRandom(4242);
    return Array.from({ length: 90 }, () => ({
      x: rand() * width,
      y: rand() * height,
      size: rand() < 0.7 ? 2 : 3,
      tone: rand(),
    }));
  }, [width, height]);

  const skyline = useMemo(() => {
    if (city.length > 0) {
      return cityToSkyline(city, width, 7, true).map(b => ({
        x: b.x,
        w: b.width,
        h: b.height,
        windows: b.windows,
      }));
    }
    const rand = seededRandom(1717);
    const buildings: { x: number; w: number; h: number; windows: { x: number; y: number }[] }[] = [];
    let x = -12;
    while (x < width + 12) {
      const w = 30 + Math.floor(rand() * 40);
      const h = 40 + Math.floor(rand() * 80);
      const windows: { x: number; y: number }[] = [];
      for (let wy = 10; wy < h - 8; wy += 16) {
        for (let wx = 6; wx < w - 8; wx += 14) {
          if (rand() < 0.18) windows.push({ x: wx, y: wy });
        }
      }
      buildings.push({ x, w, h, windows });
      x += w + 6 + Math.floor(rand() * 14);
    }
    return buildings;
  }, [city, width]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Pixel dust */}
      {speckles.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            backgroundColor:
              s.tone < 0.45
                ? 'rgba(255,255,255,0.05)'
                : s.tone < 0.75
                  ? theme.primary + '2E'
                  : 'rgba(255,255,255,0.09)',
          }}
        />
      ))}

      {/* Faint city silhouette along the bottom */}
      {skyline.map((b, i) => (
        <View
          key={`b${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            bottom: 0,
            width: b.w,
            height: b.h,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          {b.windows.map((w, wi) => (
            <View
              key={wi}
              style={{
                position: 'absolute',
                left: w.x,
                bottom: w.y,
                width: 4,
                height: 4,
                backgroundColor: theme.primary + '3D',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
