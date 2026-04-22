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

// One pulsing ring
function PulseRing({ delay, color }: { delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
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
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

// Slow breathing glow in the center
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
    <Animated.View
      style={[
        styles.glow,
        { backgroundColor: color, opacity, transform: [{ scale }] },
      ]}
    />
  );
}

export default function FocusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks } = useTasks();
  const task = tasks.find(t => t.id === id);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const color = task ? hourColor(task.estimatedHours) : '#6C63FF';

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

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

      {/* Timer */}
      <View style={styles.timerWrapper}>
        <Text style={[styles.timer, { color: goalReached ? color : '#ffffff' }]}>
          {formatTime(elapsed)}
        </Text>
        <Text style={styles.goal}>
          {goalReached
            ? "Today's goal reached!"
            : `Goal: ${formatTime(targetSeconds)}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {Math.round(progress * 100)}% of today's {task.hoursPerDay}h goal
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playBtn, { borderColor: color }]}
          onPress={() => setRunning(r => !r)}
        >
          <Text style={[styles.playIcon, { color }]}>
            {running ? '⏸' : '▶'}
          </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
  },
  topInfo: {
    position: 'absolute',
    top: 72,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  className: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  assignmentName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerWrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timer: {
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  goal: {
    color: '#555',
    fontSize: 14,
    marginTop: 6,
  },
  progressBg: {
    width: 260,
    height: 4,
    backgroundColor: '#1e1e1e',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    color: '#555',
    fontSize: 12,
    marginBottom: 48,
  },
  controls: {
    marginBottom: 24,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  stopBtn: {
    position: 'absolute',
    bottom: 52,
  },
  stopText: {
    color: '#444',
    fontSize: 15,
    fontWeight: '600',
  },
});
