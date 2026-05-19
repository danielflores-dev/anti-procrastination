import { useCoins } from '@/context/CoinContext';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { useTasks } from '@/context/TaskContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ThemeButton } from '@/components/ui/design-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

const COIN_INTERVAL = 30; // 30 seconds = 2 coins per minute

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

function PulseRing({ delay, color }: { delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 3000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 3000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, opacity, scale]);

  return (
    <Animated.View style={[styles.ring, { borderColor: color, opacity, transform: [{ scale }] }]} />
  );
}

function BreathingGlow({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.15, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.35, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.85, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.glow, { backgroundColor: color, opacity, transform: [{ scale }] }]} />
  );
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
    <Animated.View style={[styles.coinToast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.coinToastText}>+{amount} coins</Text>
    </Animated.View>
  );
}

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
  const reducedMotion = useReducedMotion();
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
  const [sessionGoalHours, setSessionGoalHours] = useState<number | null>(null);
  const recapAnim = useRef(new Animated.Value(0)).current;
  const toastKey = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoinCount = useRef(0);
  const coinRemainder = useRef(0);

  const color = focusTask ? hourColor(focusTask.estimatedHours) : theme.primary;
  const partyCount = Math.max(1, Number(partySize ?? '1') || 1);
  const isPartySession = partyCount > 1 || !!partyRoom;
  const coinMultiplier = 1 + Math.max(0, partyCount - 1) * 0.5;
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

  // Award coins every COIN_INTERVAL seconds of active time
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
      // small delay so state flip triggers useEffect in CoinToast
      setTimeout(() => setShowToast(true), 10);
    }
  }, [elapsed, coinMultiplier, addCoins]);

  const handleStop = () => {
    setRunning(false);
    setSessionGoalHours(current => current ?? focusTask?.hoursPerDay ?? 1);
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
    setElapsed(0);
    setShowRecap(false);
    router.back();
  };

  const keepStudying = () => {
    applyGoalUpdate();
    setShowRecap(false);
    setRunning(true);
  };

  if (!focusTask) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Text style={{ color: theme.text }}>We could not find this assignment.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.primary, marginTop: 16 }}>Back to assignments</Text>
        </TouchableOpacity>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Animated background */}
      <View style={styles.bgLayer}>
        <BreathingGlow color={color} />
        <PulseRing delay={0} color={color} />
        <PulseRing delay={1000} color={color} />
        <PulseRing delay={2000} color={color} />
      </View>

      {/* Top info */}
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

      {/* Coin balance top-right */}
      <View style={styles.coinBadge}>
        <Text style={styles.coinBadgeText}>{coins} coins</Text>
        {running && (
          <Text style={styles.coinNext}>+{coinMultiplier.toFixed(1)}x in {formatTime(nextCoinIn)}</Text>
        )}
      </View>

      {/* Floating coin toast */}
      <CoinToast key={toastKey.current} visible={showToast} amount={lastCoinAmount} />

      {/* Timer */}
      <View style={styles.timerWrapper}>
        <Text style={[styles.timer, { color: goalReached ? color : '#ffffff' }]}>
          {formatTime(elapsed)}
        </Text>
        <Text style={styles.goal}>
        {goalReached ? "Today's goal is done" : `Goal: ${formatTime(targetSeconds)}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressLabel}>
        {progressPercent}% of {"today's"} {targetHours}h goal
      </Text>

      {/* Session coins */}
      {sessionCoins > 0 && (
        <Text style={styles.sessionCoins}>+{sessionCoins} coins earned this session</Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playBtn, { borderColor: color }]}
          onPress={() => setRunning(r => !r)}
        >
          <Text style={[styles.playIcon, { color }]}>{running ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
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
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
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
              <View style={styles.recapHeader}>
                <Text style={[styles.recapKicker, { color: theme.school ? theme.secondary : theme.accent }]}>Session recap</Text>
                <Text style={[styles.recapTitle, { color: theme.text }]}>{goalReached ? 'Goal complete' : 'Progress saved'}</Text>
                <Text style={[styles.recapSub, { color: theme.muted }]} numberOfLines={2}>
                  {focusTask.assignmentName}
                </Text>
              </View>

              <View style={[styles.coinHero, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.coinHeroLabel, { color: theme.muted }]}>You earned</Text>
                <Text style={[styles.coinHeroValue, { color }]}>{sessionCoins} coins</Text>
                <Text style={[styles.coinHeroMeta, { color: theme.muted }]}>
                  {isPartySession ? `${coinMultiplier.toFixed(1)}x party boost applied` : `${formatTime(elapsed)} focused`}
                </Text>
              </View>

              <View style={styles.recapMetrics}>
                <View style={[styles.recapMetric, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Text style={[styles.recapMetricValue, { color: theme.text }]}>{formatTime(elapsed)}</Text>
                  <Text style={[styles.recapMetricLabel, { color: theme.muted }]}>Time</Text>
                </View>
                <View style={[styles.recapMetric, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Text style={[styles.recapMetricValue, { color: theme.text }]}>{progressPercent}%</Text>
                  <Text style={[styles.recapMetricLabel, { color: theme.muted }]}>Goal</Text>
                </View>
              </View>

              <View style={[styles.recapNote, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.recapNoteText, { color: theme.text }]}>
                  {focusMinutes < 10
                    ? 'A short start still counts. Save it, or keep going for one more round.'
                    : goalReached
                      ? 'This assignment is on track for today.'
                      : 'If this felt harder than expected, adjust the daily goal before saving.'}
                </Text>
              </View>

              <View style={[styles.nextLoopCard, { borderColor: theme.border }]}>
                <Text style={[styles.nextLoopKicker, { color: theme.school ? theme.secondary : theme.accent }]}>Next in the loop</Text>
                <Text style={[styles.nextLoopText, { color: theme.text }]}>
                  Save to keep your streak moving. Then spend coins or join a study group for a boosted focus session.
                </Text>
              </View>

              <View style={styles.adjustHeader}>
                <Text style={[styles.adjustLabel, { color: theme.muted }]}>Daily goal</Text>
                <Text style={[styles.adjustHint, { color: theme.muted }]}>Change only if today felt off</Text>
              </View>
              <View style={styles.adjustRow}>
                <TouchableOpacity
                  style={[styles.adjustButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => setSessionGoalHours(current => Math.max(0.5, Math.round(((current ?? newGoalHours) - 0.5) * 2) / 2))}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.adjustButtonText, { color: theme.text }]}>-</Text>
                </TouchableOpacity>
                <View style={styles.adjustValue}>
                  <Text style={[styles.adjustHours, { color }]}>{newGoalHours}h</Text>
                  <Text style={[styles.adjustSub, { color: theme.muted }]}>per study day</Text>
                </View>
                <TouchableOpacity
                  style={[styles.adjustButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => setSessionGoalHours(current => Math.round(((current ?? newGoalHours) + 0.5) * 2) / 2)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recapActions}>
                <ThemeButton size="lg" onPress={finishSession}>Save and finish</ThemeButton>
                <ThemeButton size="lg" variant="secondary" onPress={keepStudying}>Keep studying</ThemeButton>
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const RING_SIZE = 360;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  bgLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 },
  ring: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 2 },
  topInfo: { position: 'absolute', top: 72, alignItems: 'center', paddingHorizontal: 32 },
  className: { color: '#666', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  assignmentName: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  partyBadge: { alignItems: 'center', borderWidth: 1, borderRadius: 16, backgroundColor: '#0f0f0fcc', marginTop: 12, paddingHorizontal: 14, paddingVertical: 9 },
  partyBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  partyBadgeMeta: { fontSize: 12, fontWeight: '800' },
  partyNames: { color: '#999', fontSize: 11, fontWeight: '700', marginTop: 4, maxWidth: 260 },
  coinBadge: {
    position: 'absolute',
    top: 68,
    right: 24,
    alignItems: 'flex-end',
  },
  coinBadgeText: { color: '#F59E0B', fontSize: 18, fontWeight: '700' },
  coinNext: { color: '#555', fontSize: 11, marginTop: 2 },
  coinToast: {
    position: 'absolute',
    top: '40%',
  },
  coinToastText: { color: '#F59E0B', fontSize: 28, fontWeight: '800' },
  timerWrapper: { alignItems: 'center', marginBottom: 32 },
  timer: { fontSize: 72, fontWeight: '200', letterSpacing: 4 },
  goal: { color: '#555', fontSize: 14, marginTop: 6 },
  progressBg: { width: 260, height: 4, backgroundColor: '#1e1e1e', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { color: '#555', fontSize: 12, marginBottom: 8 },
  sessionCoins: { color: '#F59E0B', fontSize: 13, fontWeight: '600', marginBottom: 36 },
  controls: { marginBottom: 24 },
  playBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 15, fontWeight: '900' },
  stopBtn: { position: 'absolute', bottom: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  stopText: { color: '#444', fontSize: 15, fontWeight: '600' },
  recapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000cc',
  },
  recapScroll: { width: '100%' },
  recapScrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28 },
  recapCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  recapHeader: { marginBottom: 14 },
  recapKicker: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 },
  recapTitle: { fontSize: 25, fontWeight: '900', marginBottom: 5 },
  recapSub: { fontSize: 14, lineHeight: 20 },
  coinHero: { borderRadius: 20, borderWidth: 1, padding: 16, alignItems: 'center', marginBottom: 12 },
  coinHeroLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  coinHeroValue: { fontSize: 34, fontWeight: '900', marginBottom: 2 },
  coinHeroMeta: { fontSize: 13, fontWeight: '800' },
  recapMetrics: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  recapMetric: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12 },
  recapMetricValue: { fontSize: 19, fontWeight: '900', marginBottom: 3 },
  recapMetricLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  recapNote: { borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 16 },
  recapNoteText: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  nextLoopCard: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginBottom: 16 },
  nextLoopKicker: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 5 },
  nextLoopText: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  adjustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 10 },
  adjustLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  adjustHint: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  adjustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  adjustButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  adjustButtonText: { fontSize: 24, fontWeight: '800' },
  adjustValue: { alignItems: 'center' },
  adjustHours: { fontSize: 30, fontWeight: '900' },
  adjustSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  recapActions: { gap: 10 },
});

