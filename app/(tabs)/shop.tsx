import { useCoins } from '@/context/CoinContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ShopItem = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  cost: number;
  tag: string;
};

const ITEMS: ShopItem[] = [
  {
    id: 'streak_shield',
    emoji: '🛡️',
    name: 'Streak Shield',
    description: 'Keep your streak safe if you miss one day.',
    cost: 30,
    tag: 'Protection',
  },
  {
    id: 'double_coins',
    emoji: '⚡',
    name: 'Coin Surge',
    description: 'Earn 2x coins in your next focus session.',
    cost: 50,
    tag: 'Boost',
  },
  {
    id: 'focus_music',
    emoji: '🎵',
    name: 'Focus Playlist',
    description: 'Unlock a lo-fi playlist for focus sessions.',
    cost: 75,
    tag: 'Focus',
  },
  {
    id: 'dark_theme',
    emoji: '🌑',
    name: 'Midnight Theme',
    description: 'Switch to a darker theme with blue accents.',
    cost: 100,
    tag: 'Theme',
  },
  {
    id: 'purple_theme',
    emoji: '💜',
    name: 'Neon Purple Theme',
    description: 'Switch to a bright purple app theme.',
    cost: 100,
    tag: 'Theme',
  },
  {
    id: 'skip_pass',
    emoji: '✅',
    name: 'Grace Pass',
    description: 'Mark one assignment complete when you need a reset.',
    cost: 150,
    tag: 'Utility',
  },
  {
    id: 'custom_ring',
    emoji: '💫',
    name: 'Custom Focus Ring',
    description: 'Unlock a new focus timer ring style.',
    cost: 200,
    tag: 'Cosmetic',
  },
  {
    id: 'xp_boost',
    emoji: '🚀',
    name: 'XP Rocket',
    description: 'Earn 3x coins for one week.',
    cost: 300,
    tag: 'Boost',
  },
];

const TAG_COLORS: Record<string, string> = {
  Protection: '#3B82F6',
  Boost: '#F59E0B',
  Focus: '#8B5CF6',
  Theme: '#EC4899',
  Utility: '#22C55E',
  Cosmetic: '#06B6D4',
};

export default function ShopScreen() {
  const { coins, spendCoins } = useCoins();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [owned, setOwned] = useState<Set<string>>(new Set());

  const handleBuy = (item: ShopItem) => {
    if (owned.has(item.id)) {
      Alert.alert('Already owned', `${item.name} is already in your shop items.`);
      return;
    }
    if (coins < item.cost) {
      Alert.alert(
        'Not enough coins',
        `You need ${item.cost - coins} more 🪙 to buy ${item.name}.\n\nKeep studying to earn more!`
      );
      return;
    }
    Alert.alert(
      `Buy ${item.name}?`,
      `${item.name} costs ${item.cost} coins. You have ${coins}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            const ok = spendCoins(item.cost);
            if (ok) {
              setOwned(prev => new Set([...prev, item.id]));
              Alert.alert('Purchased', `${item.name} is now yours. Item effects are coming soon.`);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Coin Shop</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>🪙 {coins}</Text>
        </View>
      </View>
      <Text style={styles.sub}>Earn coins from focus sessions. Spend them here.</Text>
      <Text style={styles.earn}>2 coins per minute</Text>

      {/* Items */}
      {ITEMS.map(item => {
        const isOwned = owned.has(item.id);
        const canAfford = coins >= item.cost;
        const tagColor = TAG_COLORS[item.tag] ?? '#888';

        return (
          <View key={item.id} style={[styles.card, isOwned && styles.cardOwned]}>
            <View style={styles.cardTop}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={[styles.tag, { backgroundColor: tagColor + '33' }]}>
                    <Text style={[styles.tagText, { color: tagColor }]}>{item.tag}</Text>
                  </View>
                </View>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <Text style={[styles.cost, !canAfford && !isOwned && styles.costUnaffordable]}>
                🪙 {item.cost}
              </Text>
              <TouchableOpacity
                style={[
                  styles.buyBtn,
                  isOwned && styles.buyBtnOwned,
                  !canAfford && !isOwned && styles.buyBtnDisabled,
                ]}
                onPress={() => handleBuy(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.buyBtnText, isOwned && styles.buyBtnTextOwned]}>
                  {isOwned ? 'Owned' : 'Buy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <Text style={styles.footer}>More items coming soon 👀</Text>
    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 60 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  heading: { fontSize: 26, fontWeight: 'bold', color: theme.text },
  balanceBadge: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  balanceText: { color: theme.primary, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.muted, fontSize: 14, marginBottom: 4 },
  earn: { color: theme.muted, fontSize: 12, marginBottom: 28 },

  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardOwned: { borderColor: theme.primary, backgroundColor: theme.surfaceAlt },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  itemEmoji: { fontSize: 36, marginRight: 14, marginTop: 2 },
  itemInfo: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  itemName: { color: theme.text, fontSize: 16, fontWeight: '700' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemDesc: { color: theme.muted, fontSize: 13, lineHeight: 19 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cost: { color: theme.secondary, fontSize: 16, fontWeight: '700' },
  costUnaffordable: { color: theme.muted },

  buyBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  buyBtnDisabled: { backgroundColor: theme.border },
  buyBtnOwned: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.primary },
  buyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  buyBtnTextOwned: { color: theme.primary },

  footer: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 12 },
});
