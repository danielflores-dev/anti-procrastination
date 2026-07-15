import { useCoins } from '@/context/CoinContext';
import { usePowerUps } from '@/context/PowerUpContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { GOLD, PIXEL_FONT, PixelButton, PixelHeading, PixelPanel } from '@/components/pixel-ui';
import ArcadeTabScreen from '@/components/ArcadeTabScreen';
import PixelBackdrop from '@/components/PixelBackdrop';
import { PixelSkyStrip } from '@/components/PixelWorld';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

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

// Items that stack and get used up, instead of being owned once.
const CONSUMABLES = new Set(['streak_shield', 'double_coins']);

export default function ShopScreen() {
  const { coins, spendCoins } = useCoins();
  const { doubleCharges, shields, addDoubleCharge, addShield } = usePowerUps();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const consumableCount = (id: string) =>
    id === 'streak_shield' ? shields : id === 'double_coins' ? doubleCharges : 0;

  const handleBuy = (item: ShopItem) => {
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
            if (!ok) return;
            if (item.id === 'streak_shield') {
              addShield();
              Alert.alert('Streak save ready', 'It will automatically cover your next missed study day.');
            } else if (item.id === 'double_coins') {
              addDoubleCharge();
              Alert.alert('Double coins armed', 'Your next focus session earns 2x coins.');
            }
          },
        },
      ]
    );
  };

  return (
    <ArcadeTabScreen index={4} style={styles.root}>
      <PixelBackdrop />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <PixelSkyStrip height={132} style={styles.sky}>
        <View style={styles.skyContent}>
          <View style={styles.skyRow}>
            <View>
              <Text style={styles.kicker}>Coins</Text>
              <Text style={styles.heading}>Rewards</Text>
            </View>
            <View style={styles.balanceRim}>
              <View style={styles.balanceFace}>
                <FontAwesome5 name="coins" size={13} color={GOLD} />
                <Text style={styles.balanceText}>{coins}</Text>
              </View>
            </View>
          </View>
        </View>
      </PixelSkyStrip>

      <View style={styles.body}>
        <PixelHeading hint="Spend coins from focus sessions." style={styles.shelfHeading}>
          Item shop
        </PixelHeading>

        {ITEMS.filter(item => CONSUMABLES.has(item.id)).map(item => {
          const count = consumableCount(item.id);
          const canAfford = coins >= item.cost;
          return (
            <PixelPanel key={item.id} style={styles.card}>
              <View style={styles.rewardMain}>
                <View style={[styles.priceBlock, { borderColor: canAfford ? GOLD : theme.border }]}>
                  <Text style={[styles.cost, !canAfford && styles.costMuted]}>
                    {item.cost}
                  </Text>
                  <Text style={styles.priceLabel}>coins</Text>
                </View>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {count > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>x{count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                </View>
                <PixelButton
                  size="sm"
                  disabled={!canAfford}
                  onPress={() => handleBuy(item)}
                  accessibilityLabel={`Buy ${item.name} for ${item.cost} coins`}
                >
                  Buy
                </PixelButton>
              </View>
            </PixelPanel>
          );
        })}

        <PixelHeading hint="The crew is still building these." style={styles.lockedHeading}>
          Under construction
        </PixelHeading>

        {ITEMS.filter(item => !CONSUMABLES.has(item.id)).map(item => (
          <PixelPanel key={item.id} style={styles.card} tone="alt">
            <View style={[styles.rewardMain, styles.lockedRow]}>
              <View style={[styles.priceBlock, { borderColor: theme.border }]}>
                <Text style={[styles.cost, styles.costMuted]}>{item.cost}</Text>
                <Text style={styles.priceLabel}>coins</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
              <View
                style={styles.lockedTag}
                accessibilityLabel={`${item.name}, coming soon`}
              >
                <FontAwesome5 name="hammer" size={10} color={theme.muted} />
                <Text style={styles.lockedTagText}>Soon</Text>
              </View>
            </View>
          </PixelPanel>
        ))}
      </View>
      </ScrollView>
    </ArcadeTabScreen>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  scroll: { flex: 1 },
  container: { paddingBottom: 118 },
  sky: { marginBottom: 16 },
  skyContent: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  skyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  body: { paddingHorizontal: 20 },
  kicker: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  balanceRim: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    borderRadius: 4,
  },
  balanceFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  balanceText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  shelfHeading: { marginBottom: 14 },
  lockedHeading: { marginTop: 26, marginBottom: 14 },
  card: { marginBottom: 10 },
  lockedRow: { opacity: 0.75 },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
  },
  lockedTagText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rewardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceBlock: {
    width: 54,
    alignItems: 'center',
    borderWidth: 2,
    paddingVertical: 6,
  },
  cost: { color: GOLD, fontSize: 15, fontWeight: '800', fontFamily: PIXEL_FONT },
  costMuted: { color: theme.muted },
  priceLabel: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  itemName: { color: theme.text, fontSize: 15, fontWeight: '800' },
  countBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  countBadgeText: {
    color: '#1C1917',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  itemDesc: { color: theme.muted, fontSize: 12, lineHeight: 17 },
});
