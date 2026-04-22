import { useCoins } from '@/context/CoinContext';
import { useTasks } from '@/context/TaskContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
  }, []);

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
  }, []);

  return (
    <Animated.View style={[styles.glow, { backgroundColor: color, opacity, transform: [{ scale }] }]} />
  );
}

// Floating "+1 🪙" toast that fades up and disappears
function CoinToast({ visible }: { visible: boolean }) {
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
  }, [visible]);

  return (
    <Animated.View style={[styles.coinToast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.coinToastText}>+1 🪙</Text>
    </Animated.View>
  );
}

export default function FocusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks } = useTasks();
  const { coins, addCoins } = useCoins();
  const task = tasks.find(t => t.id === id);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const toastKey = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoinCount = useRef(0);

  const color = task ? hourColor(task.estimatedHours) : '#6C63FF';

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
      const newCoins = earned - prevCoinCount.current;
      prevCoinCount.current = earned;
      addCoins(newCoins);
      setSessionCoins(s => s + newCoins);
      toastKey.current += 1;
      setShowToast(false);
      // small delay so state flip triggers useEffect in CoinToast
      setTimeout(() => setShowToast(true), 10);
    }
  }, [elapsed]);

  const handleStop = () => {
    setRunning(false);
    setElapsed(0);
    router.back();
  };

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff' }}>Assignment not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#6C63FF', marginTop: 16 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const targetSeconds = task.hoursPerDay * 3600;
  const progress = Math.min(elapsed / targetSeconds, 1);
  const goalReached = elapsed >= targetSeconds;
  const nextCoinIn = COIN_INTERVAL - (elapsed % COIN_INTERVAL);

  return (
    <View style={styles.container}>
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
        <Text style={styles.className}>{task.className}</Text>
        <Text style={styles.assignmentName}>{task.assignmentName}</Text>
      </View>

      {/* Coin balance top-right */}
      <View style={styles.coinBadge}>
        <Text style={styles.coinBadgeText}>🪙 {coins}</Text>
        {running && (
          <Text style={styles.coinNext}>+1 in {formatTime(nextCoinIn)}</Text>
        )}
      </View>

      {/* Floating coin toast */}
      <CoinToast key={toastKey.current} visible={showToast} />

      {/* Timer */}
      <View style={styles.timerWrapper}>
        <Text style={[styles.timer, { color: goalReached ? color : '#ffffff' }]}>
          {formatTime(elapsed)}
        </Text>
        <Text style={styles.goal}>
          {goalReached ? "Today's goal reached!" : `Goal: ${formatTime(targetSeconds)}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressLabel}>
        {Math.round(progress * 100)}% of today's {task.hoursPerDay}h goal
      </Text>

      {/* Session coins */}
      {sessionCoins > 0 && (
        <Text style={styles.sessionCoins}>+{sessionCoins} 🪙 earned this session</Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playBtn, { borderColor: color }]}
          onPress={() => setRunning(r => !r)}
        >
          <Text style={[styles.playIcon, { color }]}>{running ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
        <Text style={styles.stopText}>End Session</Text>
      </TouchableOpacity>
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
  playIcon: { fontSize: 32 },
  stopBtn: { position: 'absolute', bottom: 52 },
  stopText: { color: '#444', fontSize: 15, fontWeight: '600' },
});
