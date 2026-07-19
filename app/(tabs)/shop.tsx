import ArcadeTabScreen from '@/components/ArcadeTabScreen';
import PixelBackdrop from '@/components/PixelBackdrop';
import { DECOR_SPRITES } from '@/components/PixelCity';
import { Sprite, WORKER_DOWN } from '@/components/PixelConstruction';
import { PixelSkyStrip } from '@/components/PixelWorld';
import { GOLD, PIXEL_FONT, PixelButton, PixelConfirm, PixelHeading } from '@/components/pixel-ui';
import { useCoins } from '@/context/CoinContext';
import { usePowerUps } from '@/context/PowerUpContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { type ComponentProps, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type ShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon?: ComponentProps<typeof FontAwesome5>['name'];
};

const POWER_UPS: ShopItem[] = [
  { id: 'streak_shield', name: 'Streak save', description: 'Covers one missed study day, all by itself.', cost: 30, icon: 'shield-alt' },
  { id: 'double_coins', name: 'Double coins', description: '2x coins for your next focus session.', cost: 50, icon: 'coins' },
  { id: 'dog_treat', name: 'Dog treat', description: 'The site dog parties through your next session.', cost: 25, icon: 'bone' },
];

const CITY_UPGRADES: ShopItem[] = [
  { id: 'deco_tree', name: 'Street tree', description: 'Plant some green on your street.', cost: 60 },
  { id: 'deco_lamp', name: 'Street lamp', description: 'Light for the late shifts.', cost: 80 },
  { id: 'deco_fountain', name: 'Fountain', description: "The crew's favorite lunch spot.", cost: 150 },
];

const CREW_STYLE: ShopItem[] = [
  { id: 'dog_hardhat', name: 'Dog hard hat', description: 'Safety first for the site dog.', cost: 120 },
  { id: 'gold_confetti', name: 'Golden confetti', description: 'Every celebration rains gold.', cost: 200 },
];

const COMING_SOON: ShopItem[] = [
  { id: 'focus_music', name: 'Focus mix', description: 'Add a playlist to focus mode.', cost: 75, icon: 'music' },
  { id: 'night_theme', name: 'Night theme', description: 'A calmer look for late studying.', cost: 100, icon: 'moon' },
];

const SHOPKEEPER_LINES = [
  'Fresh stock from the crew.',
  'Coins well spent build the city.',
  'The dog has been eyeing those treats.',
  'Everything here actually works. Crew promise.',
];

// Small pixel-art hat used as the dog hard hat preview.
const HAT_PREVIEW = ['..HHHH..', '.HHHHHH.', 'HHHHHHHH'];
const HAT_PALETTE: Record<string, string> = { H: '#FACC15' };
const CONFETTI_PREVIEW = ['F.D.', '.B.F', 'D.F.'];
const CONFETTI_PALETTE: Record<string, string> = { F: '#F59E0B', D: '#FDE047', B: '#F8FAFC' };

export default function ShopScreen() {
  const { coins, spendCoins } = useCoins();
  const {
    doubleCharges, shields, dogTreats, unlocks,
    addDoubleCharge, addShield, addDogTreat, addUnlock,
  } = usePowerUps();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const shopkeeperLine = SHOPKEEPER_LINES[new Date().getDate() % SHOPKEEPER_LINES.length];
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  };

  const consumableCount = (id: string) =>
    id === 'streak_shield' ? shields : id === 'double_coins' ? doubleCharges : id === 'dog_treat' ? dogTreats : 0;

  const applyPurchase = (item: ShopItem) => {
    switch (item.id) {
      case 'streak_shield':
        addShield();
        showNotice('Streak save ready. It covers your next missed day on its own.');
        break;
      case 'double_coins':
        addDoubleCharge();
        showNotice('Double coins armed for your next focus session.');
        break;
      case 'dog_treat':
        addDogTreat();
        showNotice('Treat bought. The dog parties through your next session.');
        break;
      default:
        addUnlock(item.id);
        showNotice(`${item.name} built. Check your city on the home screen.`);
    }
  };

  const handleBuy = (item: ShopItem) => {
    if (coins < item.cost) {
      showNotice(`You need ${item.cost - coins} more coins. Focus sessions pay.`);
      return;
    }
    setConfirmItem(item);
  };

  const confirmBuy = () => {
    if (!confirmItem) return;
    if (spendCoins(confirmItem.cost)) applyPurchase(confirmItem);
    setConfirmItem(null);
  };

  const renderPreview = (item: ShopItem) => {
    if (DECOR_SPRITES[item.id]) {
      return <Sprite rows={DECOR_SPRITES[item.id].rows} px={4} palette={DECOR_SPRITES[item.id].palette} />;
    }
    if (item.id === 'dog_hardhat') {
      return <Sprite rows={HAT_PREVIEW} px={5} palette={HAT_PALETTE} />;
    }
    if (item.id === 'gold_confetti') {
      return <Sprite rows={CONFETTI_PREVIEW} px={6} palette={CONFETTI_PALETTE} />;
    }
    return <FontAwesome5 name={item.icon ?? 'cube'} size={20} color={theme.primary} />;
  };

  const renderRow = (item: ShopItem, kind: 'consumable' | 'unlock' | 'wip') => {
    const count = consumableCount(item.id);
    const owned = kind === 'unlock' && unlocks.includes(item.id);
    const canAfford = coins >= item.cost;
    const locked = kind === 'wip';

    return (
      <View key={item.id} style={[styles.cardRim, owned && styles.cardOwned, locked && styles.cardLocked]}>
        <View style={styles.cardFace}>
          <View style={[styles.previewBox, owned && { borderColor: '#22C55E' }]}>
            {renderPreview(item)}
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemNameRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              {kind === 'consumable' && count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>x{count}</Text>
                </View>
              )}
              {owned && (
                <View style={[styles.countBadge, { backgroundColor: '#22C55E' }]}>
                  <Text style={styles.countBadgeText}>Built</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemDesc}>{item.description}</Text>
            <Text style={[styles.itemCost, { color: locked || owned ? theme.muted : canAfford ? GOLD : theme.muted }]}>
              {item.cost} coins
            </Text>
          </View>
          {locked ? (
            <View style={styles.lockedTag} accessibilityLabel={`${item.name}, coming soon`}>
              <FontAwesome5 name="hammer" size={10} color={theme.muted} />
              <Text style={styles.lockedTagText}>Soon</Text>
            </View>
          ) : owned ? (
            <FontAwesome5 name="check-circle" size={16} color="#22C55E" />
          ) : (
            <PixelButton
              size="sm"
              disabled={!canAfford}
              onPress={() => handleBuy(item)}
              accessibilityLabel={`Buy ${item.name} for ${item.cost} coins`}
            >
              Buy
            </PixelButton>
          )}
        </View>
      </View>
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
        {/* Shopkeeper */}
        <View style={styles.keeperRow}>
          <Sprite rows={WORKER_DOWN} px={3} />
          <View style={styles.speechRim}>
            <View style={styles.speechFace}>
              <Text style={styles.speechText}>{shopkeeperLine}</Text>
            </View>
          </View>
        </View>

        {notice && (
          <View style={styles.noticeBanner}>
            <FontAwesome5 name="info-circle" size={12} color="#1C1917" />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        <PixelHeading hint="Used up when they trigger." style={styles.shelfHeading}>
          Power-ups
        </PixelHeading>
        {POWER_UPS.map(item => renderRow(item, 'consumable'))}

        <PixelHeading hint="Permanent additions to your street." style={styles.shelfHeading}>
          City upgrades
        </PixelHeading>
        {CITY_UPGRADES.map(item => renderRow(item, 'unlock'))}

        <PixelHeading hint="For the crew that studies with you." style={styles.shelfHeading}>
          Crew and style
        </PixelHeading>
        {CREW_STYLE.map(item => renderRow(item, 'unlock'))}

        <PixelHeading hint="The crew is still building these." style={styles.shelfHeading}>
          Under construction
        </PixelHeading>
        {COMING_SOON.map(item => renderRow(item, 'wip'))}
      </View>
      </ScrollView>

      {/* In-world purchase confirm (system dialogs are a no-op on web) */}
      <PixelConfirm
        visible={confirmItem !== null}
        title={confirmItem ? `Get ${confirmItem.name}?` : ''}
        message={confirmItem ? `${confirmItem.cost} coins · you have ${coins}` : undefined}
        confirmLabel="Buy"
        onConfirm={confirmBuy}
        onCancel={() => setConfirmItem(null)}
      >
        {confirmItem ? (
          <View style={styles.confirmPreviewBox}>{renderPreview(confirmItem)}</View>
        ) : null}
      </PixelConfirm>
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
  keeperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  speechRim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    borderRadius: 4,
  },
  speechFace: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  speechText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  shelfHeading: { marginTop: 14, marginBottom: 12 },
  cardRim: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    borderRadius: 4,
    marginBottom: 10,
  },
  cardOwned: { opacity: 0.9 },
  cardLocked: { opacity: 0.7 },
  cardFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    padding: 12,
  },
  previewBox: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
  },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
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
  itemCost: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    marginTop: 4,
  },
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
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '800',
  },
  confirmPreviewBox: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
  },
});
