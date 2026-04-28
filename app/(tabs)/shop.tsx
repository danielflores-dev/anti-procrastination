import { useCoins } from '@/context/CoinContext';
import { useState } from 'react';
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
    description: 'Protect your study streak for one missed day. It happens to the best of us.',
    cost: 30,
    tag: 'Protection',
  },
  {
    id: 'double_coins',
    emoji: '⚡',
    name: 'Coin Surge',
    description: 'Earn 2× coins for your next focus session. Stack your rewards faster.',
    cost: 50,
    tag: 'Boost',
  },
  {
    id: 'focus_music',
    emoji: '🎵',
    name: 'Focus Playlist',
    description: 'Unlock a curated lo-fi playlist that plays during your focus sessions.',
    cost: 75,
    tag: 'Focus',
  },
  {
    id: 'dark_theme',
    emoji: '🌑',
    name: 'Midnight Theme',
    description: 'A deeper, richer dark theme with blue accents across the whole app.',
    cost: 100,
    tag: 'Theme',
  },
  {
    id: 'purple_theme',
    emoji: '💜',
    name: 'Neon Purple Theme',
    description: 'Turn the accent color up to 11 with a vivid neon purple look.',
    cost: 100,
    tag: 'Theme',
  },
  {
    id: 'skip_pass',
    emoji: '✅',
    name: 'Grace Pass',
    description: 'Mark one assignment as complete without penalty. Use wisely.',
    cost: 150,
    tag: 'Utility',
  },
  {
    id: 'custom_ring',
    emoji: '💫',
    name: 'Custom Focus Ring',
    description: 'Unlock animated star & galaxy ring effects for your focus mode background.',
    cost: 200,
    tag: 'Cosmetic',
  },
  {
    id: 'xp_boost',
    emoji: '🚀',
    name: 'XP Rocket',
    description: '3× coins for an entire week. Supercharge your reward rate.',
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
  const [owned, setOwned] = useState<Set<string>>(new Set());

  const handleBuy = (item: ShopItem) => {
    if (owned.has(item.id)) {
      Alert.alert('Already owned', `You already have ${item.name}.`);
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
      `This will cost ${item.cost} 🪙. You currently have ${coins} 🪙.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            const ok = spendCoins(item.cost);
            if (ok) {
              setOwned(prev => new Set([...prev, item.id]));
              Alert.alert('Purchased!', `${item.emoji} ${item.name} is now yours. (Coming soon — stay tuned!)`);
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
      <Text style={styles.sub}>Earn coins by studying. Spend them here.</Text>
      <Text style={styles.earn}>2 coins per minute of focus time</Text>

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

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0f0f0f' },
  container: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 60 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  heading: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  balanceBadge: {
    backgroundColor: '#F59E0B22',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F59E0B55',
  },
  balanceText: { color: '#F59E0B', fontSize: 16, fontWeight: '700' },
  sub: { color: '#666', fontSize: 14, marginBottom: 4 },
  earn: { color: '#444', fontSize: 12, marginBottom: 28 },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardOwned: { borderColor: '#6C63FF55', backgroundColor: '#1a1a2a' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  itemEmoji: { fontSize: 36, marginRight: 14, marginTop: 2 },
  itemInfo: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemDesc: { color: '#888', fontSize: 13, lineHeight: 19 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cost: { color: '#F59E0B', fontSize: 16, fontWeight: '700' },
  costUnaffordable: { color: '#555' },

  buyBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  buyBtnDisabled: { backgroundColor: '#2a2a2a' },
  buyBtnOwned: { backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: '#6C63FF55' },
  buyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  buyBtnTextOwned: { color: '#6C63FF' },

  footer: { color: '#333', fontSize: 13, textAlign: 'center', marginTop: 12 },
});
