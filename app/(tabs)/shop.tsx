import { useCoins } from '@/context/CoinContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ShopItem = {
  id: string;
  initials: string;
  name: string;
  description: string;
  cost: number;
  tag: string;
};

const ITEMS: ShopItem[] = [
  {
    id: 'streak_shield',
    initials: 'SS',
    name: 'Streak Shield',
    description: 'Keep your streak safe if you miss one day.',
    cost: 30,
    tag: 'Protection',
  },
  {
    id: 'double_coins',
    initials: '2x',
    name: 'Double Focus',
    description: 'Double the coins from your next focus session.',
    cost: 50,
    tag: 'Boost',
  },
  {
    id: 'focus_music',
    initials: 'FM',
    name: 'Focus Mix',
    description: 'Save a study playlist to your focus screen.',
    cost: 75,
    tag: 'Focus',
  },
  {
    id: 'dark_theme',
    initials: 'MT',
    name: 'Midnight Theme',
    description: 'Use a quieter theme for late-night studying.',
    cost: 100,
    tag: 'Theme',
  },
  {
    id: 'purple_theme',
    initials: 'CT',
    name: 'Campus Theme',
    description: 'Save a second color preset for your dashboard.',
    cost: 100,
    tag: 'Theme',
  },
  {
    id: 'skip_pass',
    initials: 'GP',
    name: 'Grace Pass',
    description: 'Mark one assignment complete when you need a reset.',
    cost: 150,
    tag: 'Utility',
  },
  {
    id: 'custom_ring',
    initials: 'FR',
    name: 'Focus Ring',
    description: 'Choose a calmer timer ring style.',
    cost: 200,
    tag: 'Cosmetic',
  },
  {
    id: 'xp_boost',
    initials: 'WK',
    name: 'Finals Week Boost',
    description: 'Earn extra coins during a heavy study week.',
    cost: 300,
    tag: 'Boost',
  },
];

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
        `You need ${item.cost - coins} more coins to buy ${item.name}.\n\nKeep studying to earn more!`
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
              Alert.alert('Purchased', `${item.name} is ready for your next focus session.`);
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
          <Text style={styles.kicker}>Rewards</Text>
          <Text style={styles.heading}>Rewards</Text>
        </View>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>{coins}</Text>
          <Text style={styles.balanceLabel}>coins</Text>
        </View>
      </View>
      <View style={styles.shopIntro}>
        <Text style={styles.sub}>Use coins from focus sessions.</Text>
      </View>

      <Text style={styles.shelfLabel}>Study boosts</Text>
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
              <View style={styles.cardTop}>
                <Text style={styles.itemInitials}>{item.initials}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                </View>
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

      <Text style={styles.footer}>Rewards rotate as your study streak grows.</Text>
    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 118 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  kicker: { color: theme.school ? theme.secondary : theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.35, marginBottom: 5, textTransform: 'uppercase' },
  heading: { fontSize: 26, fontWeight: '700', color: theme.text },
  balanceBadge: {
    minWidth: 72,
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.school ? theme.secondary : theme.primary,
    alignItems: 'center',
  },
  balanceText: { color: theme.school ? theme.background : theme.onPrimary, fontSize: 16, fontWeight: '700' },
  balanceLabel: { color: theme.school ? theme.background : theme.onPrimary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },
  shopIntro: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 14, marginBottom: 22 },
  sub: { color: theme.muted, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  earn: { color: theme.school ? theme.secondary : theme.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  shelfLabel: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },

  card: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 14,
  },
  cardOwned: { backgroundColor: theme.surfaceAlt, borderRadius: 16, paddingHorizontal: 12, borderTopWidth: 0, marginBottom: 8 },
  rewardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardTop: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  itemInitials: { color: theme.text, backgroundColor: theme.surfaceAlt, borderRadius: 14, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', fontSize: 14, fontWeight: '800', marginRight: 12, marginTop: 2, width: 44, height: 44, lineHeight: 44 },
  itemInfo: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  itemName: { color: theme.text, fontSize: 16, fontWeight: '700' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35 },
  itemDesc: { color: theme.muted, fontSize: 13, lineHeight: 19 },

  priceColumn: { width: 50, alignItems: 'center' },
  priceLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  cardBottom: { alignItems: 'flex-end', gap: 8, marginTop: 10 },
  cost: { color: theme.secondary, fontSize: 15, fontWeight: '700' },
  costUnaffordable: { color: theme.muted },

  buyBtn: {
    minHeight: 44,
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  buyBtnDisabled: { backgroundColor: theme.border },
  buyBtnOwned: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.primary },
  buyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  buyBtnTextOwned: { color: theme.primary },

  footer: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 12 },
});
