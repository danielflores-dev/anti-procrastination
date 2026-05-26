import { useCoins } from '@/context/CoinContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

const ITEMS: ShopItem[] = [
  {
    id: 'streak_shield',
    name: 'Streak save',
    description: 'Use once when you miss a day.',
    cost: 30,
  },
  {
    id: 'double_coins',
    name: 'Double coins',
    description: 'Applies to your next focus session.',
    cost: 50,
  },
  {
    id: 'focus_music',
    name: 'Focus mix',
    description: 'Add a playlist to focus mode.',
    cost: 75,
  },
  {
    id: 'dark_theme',
    name: 'Night theme',
    description: 'A calmer look for late studying.',
    cost: 100,
  },
  {
    id: 'purple_theme',
    name: 'Campus theme',
    description: 'Save another color preset.',
    cost: 100,
  },
  {
    id: 'skip_pass',
    name: 'Grace pass',
    description: 'Use when a week gets messy.',
    cost: 150,
  },
  {
    id: 'custom_ring',
    name: 'Focus ring',
    description: 'Change the timer ring.',
    cost: 200,
  },
  {
    id: 'xp_boost',
    name: 'Finals week',
    description: 'Extra coins during a hard week.',
    cost: 300,
  },
];

export default function ShopScreen() {
  const { coins, spendCoins } = useCoins();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [owned, setOwned] = useState<Set<string>>(new Set());

  const handleBuy = (item: ShopItem) => {
    if (owned.has(item.id)) {
      Alert.alert('Already saved', `${item.name} is already yours.`);
      return;
    }
    if (coins < item.cost) {
      Alert.alert(
        'Not enough coins',
        `You need ${item.cost - coins} more.`
      );
      return;
    }
    Alert.alert(
      `Get ${item.name}?`,
      `${item.cost} coins. You have ${coins}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            const ok = spendCoins(item.cost);
            if (ok) {
              setOwned(prev => new Set([...prev, item.id]));
              Alert.alert('Ready', `${item.name} is saved.`);
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
        <View>
          <Text style={styles.kicker}>Coins</Text>
          <Text style={styles.heading}>Rewards</Text>
        </View>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>{coins}</Text>
          <Text style={styles.balanceLabel}>coins</Text>
        </View>
      </View>
      <Text style={styles.shelfLabel}>Available</Text>
      {ITEMS.map(item => {
        const isOwned = owned.has(item.id);
        const canAfford = coins >= item.cost;
        return (
          <View key={item.id} style={[styles.card, isOwned && styles.cardOwned]}>
            <View style={styles.rewardMain}>
              <View style={styles.priceColumn}>
                <Text style={[styles.cost, !canAfford && !isOwned && styles.costUnaffordable]}>
                  {item.cost}
                </Text>
                <Text style={styles.priceLabel}>coins</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
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
    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 118 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  kicker: { color: theme.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0, marginBottom: 5 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.text },
  balanceBadge: {
    minWidth: 72,
    borderBottomWidth: 1,
    borderBottomColor: theme.primary,
    paddingHorizontal: 2,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  balanceText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  balanceLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', marginTop: 1 },
  shopIntro: { display: 'none' },
  sub: { color: theme.muted, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  earn: { color: theme.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  shelfLabel: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },

  card: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 14,
  },
  cardOwned: { backgroundColor: 'transparent', paddingHorizontal: 0, borderTopWidth: 1, marginBottom: 0 },
  rewardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardTop: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  itemInitials: { display: 'none' },
  itemInfo: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  itemName: { color: theme.text, fontSize: 16, fontWeight: '700' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35 },
  itemDesc: { color: theme.muted, fontSize: 13, lineHeight: 19 },

  priceColumn: { width: 50, alignItems: 'center' },
  priceLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  cardBottom: { alignItems: 'flex-end', gap: 8, marginTop: 10 },
  cost: { color: theme.primary, fontSize: 15, fontWeight: '700' },
  costUnaffordable: { color: theme.muted },

  buyBtn: {
    minHeight: 44,
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  buyBtnDisabled: { backgroundColor: theme.border },
  buyBtnOwned: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.primary },
  buyBtnText: { color: theme.onPrimary, fontSize: 14, fontWeight: '700' },
  buyBtnTextOwned: { color: theme.primary },

  footer: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 12 },
});
