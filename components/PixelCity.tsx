import { GOLD, PIXEL_FONT } from '@/components/pixel-ui';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import type { CityBuilding } from '@/context/TaskContext';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PX = 5;

const BODY_COLORS = ['#B45309', '#475569', '#0E7490', '#7C2D12', '#4C1D95', '#9F1239'];
const ROOF_COLORS = ['#DC2626', '#94A3B8', '#14B8A6', '#A16207', '#8B5CF6', '#F472B6'];
const WINDOW_LIT = '#FDE68A';
const WINDOW_DARK = '#1E293B';
const DOOR = '#292524';
const GROUND = '#57534E';
const GROUND_DARK = '#44403C';

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function Building({ building, selected, onPress }: {
  building: CityBuilding;
  selected: boolean;
  onPress: () => void;
}) {
  const rand = seededRandom(building.seed);
  const widthUnits = 7 + Math.floor(rand() * 4);           // 7-10
  const heightUnits = 4 + building.size * 4 + Math.floor(rand() * 3); // ~8-19
  const body = BODY_COLORS[Math.floor(rand() * BODY_COLORS.length)];
  const roof = ROOF_COLORS[Math.floor(rand() * ROOF_COLORS.length)];
  const hasAntenna = building.size === 3;

  const width = widthUnits * PX;
  const height = heightUnits * PX;

  const windows: { x: number; y: number; lit: boolean }[] = [];
  for (let wy = 2; wy < heightUnits - 3; wy += 3) {
    for (let wx = 1; wx < widthUnits - 1; wx += 3) {
      windows.push({ x: wx * PX, y: wy * PX, lit: rand() < 0.55 });
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Building from ${building.name}`}
      accessibilityRole="button"
      style={styles.buildingWrap}
    >
      {hasAntenna && (
        <View style={{ width: PX, height: PX * 3, backgroundColor: roof }} />
      )}
      <View style={{ width: width + PX * 2, height: PX, backgroundColor: roof }} />
      <View
        style={{
          width,
          height,
          backgroundColor: body,
          borderWidth: selected ? 2 : 0,
          borderColor: GOLD,
        }}
      >
        {windows.map((w, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: w.x,
              top: w.y,
              width: PX,
              height: PX,
              backgroundColor: w.lit ? WINDOW_LIT : WINDOW_DARK,
            }}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: Math.floor(widthUnits / 2 - 1) * PX,
            width: PX * 2,
            height: PX * 3,
            backgroundColor: DOOR,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function PixelCity({ buildings }: { buildings: CityBuilding[] }) {
  const { theme } = useSchoolTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = buildings.find(b => b.id === selectedId) ?? null;

  if (buildings.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.signPost}>
          <View style={styles.signBoard}>
            <Text style={styles.signText}>LOT FOR SALE</Text>
          </View>
          <View style={styles.signLeg} />
        </View>
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          Finish an assignment to raise your first building.
        </Text>
        <View style={[styles.ground, { backgroundColor: GROUND }]} />
        <View style={[styles.ground, { backgroundColor: GROUND_DARK }]} />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}
      >
        {buildings.map(building => (
          <Building
            key={building.id}
            building={building}
            selected={building.id === selectedId}
            onPress={() => setSelectedId(current => (current === building.id ? null : building.id))}
          />
        ))}
      </ScrollView>
      <View style={[styles.ground, { backgroundColor: GROUND }]} />
      <View style={[styles.ground, { backgroundColor: GROUND_DARK }]} />
      <View style={styles.caption}>
        {selected ? (
          <Text style={[styles.captionText, { color: theme.text }]} numberOfLines={1}>
            {selected.name} · {selected.className} · {new Date(selected.finishedAt).toLocaleDateString()}
          </Text>
        ) : (
          <Text style={[styles.captionText, { color: theme.muted }]}>
            {buildings.length} building{buildings.length === 1 ? '' : 's'} · tap one to see its story
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroller: {
    height: 120,
  },
  row: {
    alignItems: 'flex-end',
    gap: PX * 2,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  buildingWrap: {
    alignItems: 'center',
  },
  ground: {
    height: PX,
    alignSelf: 'stretch',
  },
  caption: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  captionText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: PIXEL_FONT,
  },
  empty: {
    paddingTop: 14,
  },
  signPost: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  signBoard: {
    backgroundColor: '#A16207',
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.25)',
    borderLeftColor: 'rgba(255,255,255,0.25)',
    borderBottomColor: 'rgba(0,0,0,0.35)',
    borderRightColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  signText: {
    color: '#FEF3C7',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1,
  },
  signLeg: {
    width: PX,
    height: PX * 4,
    backgroundColor: '#78716C',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
});
