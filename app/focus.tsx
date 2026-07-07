import { useCoins } from '@/context/CoinContext';
import { usePowerUps } from '@/context/PowerUpContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useTasks } from '@/context/TaskContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GOLD, PIXEL_FONT, PixelButton } from '@/components/pixel-ui';
import PixelConstruction, { Sprite } from '@/components/PixelConstruction';
import PixelConfettiBurst from '@/components/PixelConfetti';
import PixelWorld from '@/components/PixelWorld';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const COIN_INTERVAL = 30;

// Pixel trophy shown when the daily goal is reached.
const TROPHY = [
  'k.kkkkkkk.k',
  'kkHHHHHHHkk',
  'k.HHHHHHH.k',
  'kk.HHHHH.kk',
  '..kHHHHHk..',
  '...kHHHk...',
  '....kHk....',
  '....kHk....',
  '..kHHHHHk..',
  '..kwwwwwk..',
];

// Pixel coin stack for regular session recaps.
const COIN_STACK = [
  '....HHHH...',
  '...HhhhhH..',
  '....HHHH...',
  '.HHHH.HHHH.',
  'HhhhhHhhhhH',
  '.HHHH.HHHH.',
];

// Static confetti squares around the trophy (positions inside the 230px wrap).
const CONFETTI = [
  { x: 14, y: 8, color: GOLD },
  { x: 204, y: 14, color: '#22C55E' },
  { x: 34, y: 44, color: '#EC4899' },
  { x: 192, y: 48, color: GOLD },
  { x: 64, y: 0, color: '#22C55E' },
  { x: 156, y: 4, color: '#EC4899' },
  { x: 4, y: 30, color: '#22C55E' },
  { x: 218, y: 32, color: GOLD },
];

function hourColor(hours: number): string {
  if (hours < 2) return '#22C55E';
  if (hours < 5) return '#F59E0B';
  return '#EF4444';
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function CoinToast({ visible, amount }: { visible: boolean; amount: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(0);
    opacity.setValue(1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, visible]);

  return (
    <Animated.View style={[coinToastStyles.wrap, { opacity, transform: [{ translateY }] }]}>
      <Text style={coinToastStyles.text}>+{amount} coins</Text>
    </Animated.View>
  );
}

const coinToastStyles = StyleSheet.create({
  wrap: { position: 'absolute', top: '40%' },
  text: { color: '#F59E0B', fontSize: 28, fontWeight: '800' },
});

export default function FocusScreen() {
  const router = useRouter();
  const { id, partyRoom, partySize, partyNames, assignmentName, className, goalHours } = useLocalSearchParams<{
    id: string;
    partyRoom?: string;
    partySize?: string;
    partyNames?: string;
    assignmentName?: string;
    className?: string;
    goalHours?: string;
  }>();
  const { tasks, addStudySession, updateHoursPerDay, updateProgress } = useTasks();
  const { theme } = useSchoolTheme();
  const { coins, addCoins } = useCoins();
  const { doubleCharges, consumeDoubleCharge } = usePowerUps();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const task = tasks.find(t => t.id === id);
  const focusTask = task ?? (
    assignmentName
      ? {
          id,
          assignmentName,
          className: className ?? 'Study group',
          description: '',
          dueDate: '',
          dueDateRaw: new Date().toISOString(),
          estimatedHours: Number(goalHours ?? '1') || 1,
          hoursPerDay: Number(goalHours ?? '1') || 1,
        }
      : null
  );

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [lastCoinAmount, setLastCoinAmount] = useState(1);
  const [showRecap, setShowRecap] = useState(false);
  const [showGoalAdjust, setShowGoalAdjust] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [sessionGoalHours, setSessionGoalHours] = useState<number | null>(null);
  const recapAnim = useRef(new Animated.Value(0)).current;
  const toastKey = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoinCount = useRef(0);
  const coinRemainder = useRef(0);

  const color = focusTask ? hourColor(focusTask.estimatedHours) : theme.primary;
  const partyCount = Math.max(1, Number(partySize ?? '1') || 1);
  const isPartySession = partyCount > 1 || !!partyRoom;
  const boostActive = doubleCharges > 0;
  const coinMultiplier = (1 + Math.max(0, partyCount - 1) * 0.5) * (boostActive ? 2 : 1);
  const partyNameList = partyNames ? partyNames.split(', ').filter(Boolean) : [];
  const focusTaskId = focusTask?.id;
  const focusTaskHours = focusTask?.hoursPerDay;

  useEffect(() => {
    if (focusTaskHours) setSessionGoalHours(focusTaskHours);
  }, [focusTaskId, focusTaskHours]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    const earned = Math.floor(elapsed / COIN_INTERVAL);
    if (earned > prevCoinCount.current) {
      const baseCoins = earned - prevCoinCount.current;
      prevCoinCount.current = earned;
      coinRemainder.current += baseCoins * coinMultiplier;
      const newCoins = Math.floor(coinRemainder.current);
      if (newCoins <= 0) return;
      coinRemainder.current -= newCoins;
      addCoins(newCoins);
      setSessionCoins(s => s + newCoins);
      setLastCoinAmount(newCoins);
      toastKey.current += 1;
      setShowToast(false);
      setTimeout(() => setShowToast(true), 10);
    }
  }, [elapsed, coinMultiplier, addCoins]);

  const handleStop = () => {
    setRunning(false);
    setSessionGoalHours(current => current ?? focusTask?.hoursPerDay ?? 1);
    setShowGoalAdjust(false);
    setShowRecap(true);
  };

  useEffect(() => {
    if (!showRecap) return;
    if (reducedMotion) {
      recapAnim.setValue(1);
      return;
    }
    recapAnim.setValue(0);
    Animated.timing(recapAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [recapAnim, reducedMotion, showRecap]);

  const applyGoalUpdate = () => {
    if (task && sessionGoalHours) updateHoursPerDay(task.id, sessionGoalHours);
  };

  if (!focusTask) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Assignment not found</Text>
        <Text style={styles.notFoundBody}>This assignment may have been removed.</Text>
        <PixelButton onPress={() => router.back()} style={styles.notFoundBtn}>
          Back to assignments
        </PixelButton>
      </View>
    );
  }

  const targetHours = sessionGoalHours ?? focusTask.hoursPerDay;
  const targetSeconds = targetHours * 3600;
  const progress = Math.min(elapsed / targetSeconds, 1);
  const goalReached = elapsed >= targetSeconds;
  const nextCoinIn = COIN_INTERVAL - (elapsed % COIN_INTERVAL);
  const focusMinutes = Math.floor(elapsed / 60);
  const progressPercent = Math.round(progress * 100);
  const newGoalHours = sessionGoalHours ?? focusTask.hoursPerDay;

  const finishSession = () => {
    if (!focusTask) return;
    applyGoalUpdate();
    addStudySession({
      taskId: task?.id,
      assignmentName: focusTask.assignmentName,
      className: focusTask.className,
      focusedSeconds: elapsed,
      coinsEarned: sessionCoins,
      goalHours: newGoalHours,
      progressPercent,
      coinMultiplier,
      partyRoom,
    });
    if (task) {
      updateProgress(task.id, goalReached ? 'Done' : progressPercent >= 75 ? 'Almost done' : 'Working');
    }
    if (boostActive && elapsed > 0) consumeDoubleCharge();
    setShowRecap(false);
    if (reducedMotion) {
      setElapsed(0);
      router.back();
      return;
    }
    setCelebrating(true);
  };

  const finishCelebration = () => {
    setCelebrating(false);
    setElapsed(0);
    router.back();
  };

  const keepStudying = () => {
    applyGoalUpdate();
    setShowRecap(false);
    setRunning(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <PixelWorld reducedMotion={reducedMotion} />

      <View style={styles.topInfo}>
        <Text style={styles.className}>{focusTask.className}</Text>
        <Text style={styles.assignmentName}>{focusTask.assignmentName}</Text>
        {isPartySession && (
          <View style={[styles.partyBadge, { borderColor: color }]}>
            <Text style={styles.partyBadgeText}>{partyRoom ?? 'Study party'}</Text>
            <Text style={[styles.partyBadgeMeta, { color }]}>
              {partyCount} students, {coinMultiplier.toFixed(1)}x coins
            </Text>
            {partyNameList.length > 0 && (
              <Text style={styles.partyNames} numberOfLines={1}>{partyNameList.join(' + ')}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.coinBadge}>
        <Text style={styles.coinBadgeText}>{coins} coins</Text>
        {boostActive && <Text style={styles.boostText}>2x boost active</Text>}
        {running && (
          <Text style={styles.coinNext}>+{coinMultiplier.toFixed(1)}x in {formatTime(nextCoinIn)}</Text>
        )}
      </View>

      <CoinToast key={toastKey.current} visible={showToast} amount={lastCoinAmount} />

      {/* Game-style timer panel */}
      <View style={styles.timerPanel}>
        <Text
          style={[styles.timer, { color: goalReached ? color : '#F8FAFC' }]}
          accessibilityLabel={`Timer: ${formatTime(elapsed)}`}
          accessibilityLiveRegion="polite"
        >
          {formatTime(elapsed)}
        </Text>
        <Text style={styles.goal}>
          {goalReached ? "Today's goal is done" : `Goal: ${formatTime(targetSeconds)}`}
        </Text>
        <View
          style={styles.progressBg}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
          accessibilityLabel={`${progressPercent}% of today's ${targetHours} hour goal`}
        >
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={styles.progressLabel}>
          {progressPercent}% of {"today's"} {targetHours}h goal
        </Text>
        {sessionCoins > 0 && (
          <Text style={styles.sessionCoins}>+{sessionCoins} coins earned this session</Text>
        )}
      </View>

      {/* Construction site standing on the ground plane */}
      <View style={styles.siteWrapper} pointerEvents="none">
        <PixelConstruction progress={progress} running={running} reducedMotion={reducedMotion} />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playBtn, { borderColor: color }]}
          onPress={() => setRunning(r => !r)}
          accessibilityLabel={running ? 'Pause session' : 'Start session'}
          accessibilityRole="button"
        >
          <Text style={[styles.playIcon, { color }]}>{running ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.stopBtn}
        onPress={handleStop}
        accessibilityLabel="End session"
        accessibilityRole="button"
      >
        <Text style={styles.stopText}>End session</Text>
      </TouchableOpacity>

      {showRecap && (
        <Animated.View style={[styles.recapOverlay, { opacity: recapAnim }]}>
          <ScrollView
            style={styles.recapScroll}
            contentContainerStyle={styles.recapScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.recapCard,
                {
                  transform: [
                    {
                      translateY: recapAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: recapAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Result banner */}
              <View style={[styles.recapBanner, { backgroundColor: goalReached ? GOLD : theme.primary }]}>
                <Text style={[styles.recapBannerText, { color: goalReached ? '#1C1917' : theme.onPrimary }]}>
                  {goalReached ? 'Goal complete!' : 'Session recap'}
                </Text>
              </View>

              <View style={styles.recapBody}>
                {/* Trophy or coin stack, with confetti on a finished goal */}
                <View style={styles.recapSpriteWrap}>
                  {goalReached && CONFETTI.map((c, i) => (
                    <View
                      key={i}
                      style={{ position: 'absolute', left: c.x, top: c.y, width: 5, height: 5, backgroundColor: c.color }}
                    />
                  ))}
                  <Sprite rows={goalReached ? TROPHY : COIN_STACK} px={5} />
                </View>

                <Text style={styles.recapSub} numberOfLines={2}>{focusTask.assignmentName}</Text>

                {/* Coins earned + session summary in one block */}
                <View style={styles.coinHero}>
                  <Text style={styles.coinHeroLabel}>You earned</Text>
                  <Text style={styles.coinHeroValue}>{sessionCoins}</Text>
                  <Text style={styles.coinHeroMeta}>coins</Text>
                  <Text style={styles.coinHeroSummary}>
                    {`${formatTime(elapsed)} focused · ${progressPercent}% of goal${isPartySession ? ` · ${coinMultiplier.toFixed(1)}x bonus` : ''}`}
                  </Text>
                </View>

                {focusMinutes < 10 && !goalReached && (
                  <Text style={styles.recapNoteText}>
                    A short start still counts. Save it, or keep going for one more round.
                  </Text>
                )}

                {/* Daily goal, collapsed by default */}
                <TouchableOpacity
                  style={styles.adjustToggle}
                  onPress={() => setShowGoalAdjust(v => !v)}
                  activeOpacity={0.8}
                  accessibilityLabel={showGoalAdjust ? 'Hide daily goal settings' : 'Adjust daily goal'}
                  accessibilityRole="button"
                >
                  <Text style={styles.adjustToggleText}>Daily goal: {newGoalHours}h</Text>
                  <FontAwesome5 name={showGoalAdjust ? 'chevron-up' : 'chevron-down'} size={10} color={theme.muted} />
                </TouchableOpacity>

                {showGoalAdjust && (
                  <View style={styles.adjustRow}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setSessionGoalHours(current => Math.max(0.5, Math.round(((current ?? newGoalHours) - 0.5) * 2) / 2))}
                      activeOpacity={0.85}
                      accessibilityLabel="Decrease daily goal"
                      accessibilityRole="button"
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <View style={styles.adjustValue}>
                      <Text style={[styles.adjustHours, { color }]}>{newGoalHours}h</Text>
                      <Text style={styles.adjustSub}>per study day</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setSessionGoalHours(current => Math.round(((current ?? newGoalHours) + 0.5) * 2) / 2)}
                      activeOpacity={0.85}
                      accessibilityLabel="Increase daily goal"
                      accessibilityRole="button"
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.recapActions}>
                  <PixelButton size="lg" onPress={finishSession}>Save and finish</PixelButton>
                  <PixelButton size="lg" variant="surface" onPress={keepStudying}>Keep studying</PixelButton>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      )}

      {celebrating && (
        <PixelConfettiBurst
          message={goalReached ? 'Goal complete!' : 'Saved!'}
          onDone={finishCelebration}
        />
      )}
    </View>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  notFoundTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  notFoundBody: {
    color: theme.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  notFoundBtn: {
    minWidth: 220,
  },
  topInfo: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(8,12,24,0.66)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: '86%',
    zIndex: 2,
  },
  className: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  assignmentName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  partyBadge: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.6)',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  partyBadgeText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  partyBadgeMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  partyNames: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 260,
  },
  coinBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(8,12,24,0.66)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 3,
  },
  coinBadgeText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
  },
  coinNext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  boostText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerPanel: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8,12,24,0.66)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 26,
    paddingVertical: 16,
    zIndex: 2,
  },
  timer: {
    fontSize: 44,
    fontWeight: '300',
    letterSpacing: 3,
  },
  goal: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  progressBg: {
    width: 220,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  sessionCoins: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  siteWrapper: {
    position: 'absolute',
    bottom: '22%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
  },
  playBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,24,0.7)',
  },
  playIcon: {
    fontSize: 15,
    fontWeight: '900',
  },
  stopBtn: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(8,12,24,0.55)',
    borderRadius: 22,
  },
  stopText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  recapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  recapScroll: {
    width: '100%',
  },
  recapScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  recapCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: 'rgba(255,255,255,0.16)',
    borderBottomColor: 'rgba(0,0,0,0.45)',
    borderRightColor: 'rgba(0,0,0,0.45)',
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  recapBanner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  recapBannerText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  recapBody: {
    padding: 18,
  },
  recapSpriteWrap: {
    width: 230,
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  recapSub: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: theme.muted,
    textAlign: 'center',
    marginBottom: 14,
  },
  coinHero: {
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: theme.surfaceAlt,
  },
  coinHeroLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
    color: theme.muted,
  },
  coinHeroValue: {
    fontSize: 42,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: -1,
    color: GOLD,
  },
  coinHeroMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.muted,
    marginTop: 2,
  },
  coinHeroSummary: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: PIXEL_FONT,
    color: theme.text,
    marginTop: 10,
  },
  recapNoteText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    color: theme.muted,
    textAlign: 'center',
    marginBottom: 14,
  },
  adjustToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  adjustToggleText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.muted,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    backgroundColor: theme.surfaceAlt,
  },
  adjustButtonText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    color: theme.text,
  },
  adjustValue: {
    alignItems: 'center',
  },
  adjustHours: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  adjustSub: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    color: theme.muted,
  },
  recapActions: {
    gap: 10,
  },
});
