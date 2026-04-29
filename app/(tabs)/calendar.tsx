import { Task, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useButtonPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
    ]).start();
  };
  return { scale, press };
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function taskDueKey(task: Task) {
  const d = new Date(task.dueDateRaw);
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function hourColor(h: number) {
  if (h < 2) return '#22C55E';
  if (h < 5) return '#F59E0B';
  return '#EF4444';
}

function hourLabel(h: number) {
  if (h < 2) return 'Light';
  if (h < 5) return 'Moderate';
  return 'Heavy';
}

function daysUntil(dueDateRaw: string) {
  return Math.max(0, Math.ceil(
    (new Date(dueDateRaw).getTime() - Date.now()) / 86400000
  ));
}

// ─── Task card (shown below calendar when day is selected) ────────────────────
function TaskCard({
  task, onAdjust, onAdjustTotal, onFocus, styles,
}: {
  task: Task;
  onAdjust: (delta: number) => void;
  onAdjustTotal: (delta: number) => void;
  onFocus: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const color = hourColor(task.estimatedHours);
  const days = daysUntil(task.dueDateRaw);
  const totalDaysNeeded = Math.ceil(task.estimatedHours / task.hoursPerDay);
  const onTrack = totalDaysNeeded <= days;
  const { scale, press } = useButtonPulse();

  const handleStartSession = () => {
    press();
    setTimeout(onFocus, 120);
  };

  return (
    <View style={[styles.card, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.cardAssignment}>{task.assignmentName}</Text>
          <Text style={styles.cardClass}>{task.className}</Text>
        </View>
        <View style={[styles.workloadBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.workloadLabel, { color }]}>{hourLabel(task.estimatedHours)}</Text>
          <Text style={[styles.workloadHours, { color }]}>{task.estimatedHours}h</Text>
        </View>
      </View>

      {!!task.description && (
        <Text style={styles.cardDescription}>{task.description}</Text>
      )}

      <View style={styles.dueRow}>
        <Text style={styles.dueText}>Due: {task.dueDate}</Text>
        <Text style={[styles.daysLeft, { color: days <= 1 ? '#EF4444' : days <= 3 ? '#F59E0B' : '#888' }]}>
          {days === 0 ? 'Due today!' : days === 1 ? '1 day left' : `${days} days left`}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>⏳ Daily Study Time</Text>
      <View style={styles.adjusterRow}>
        <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjust(-0.5)}>
          <Text style={styles.adjBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.hoursCenter}>
          <Text style={[styles.hoursNumber, { color }]}>{task.hoursPerDay}h</Text>
          <Text style={styles.hoursSubtext}>per day</Text>
        </View>
        <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjust(0.5)}>
          <Text style={styles.adjBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>✅ Total Estimated Time</Text>
      <View style={styles.adjusterRow}>
        <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjustTotal(-0.5)}>
          <Text style={styles.adjBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.hoursCenter}>
          <Text style={[styles.hoursNumber, { color }]}>{task.estimatedHours}h</Text>
          <Text style={styles.hoursSubtext}>total</Text>
        </View>
        <TouchableOpacity style={styles.adjBtn} onPress={() => onAdjustTotal(0.5)}>
          <Text style={styles.adjBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statusBar, { backgroundColor: onTrack ? '#22C55E22' : '#EF444422' }]}>
        <Text style={[styles.statusText, { color: onTrack ? '#22C55E' : '#EF4444' }]}>
          {onTrack
            ? `At ${task.hoursPerDay}h/day you'll finish in ${totalDaysNeeded} day${totalDaysNeeded !== 1 ? 's' : ''} — on track`
            : `At ${task.hoursPerDay}h/day you need ${totalDaysNeeded} days but only have ${days} — increase daily time`}
        </Text>
      </View>

      {days > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (totalDaysNeeded / days) * 100)}%` as any, backgroundColor: onTrack ? color : '#EF4444' },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{totalDaysNeeded}/{days} days</Text>
        </View>
      )}

      {/* Start Homework Session button */}
      <Animated.View style={[styles.sessionBtnWrap, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={[styles.sessionBtn, { borderColor: color, shadowColor: color }]}
          onPress={handleStartSession}
          activeOpacity={1}
        >
          <Text style={styles.sessionBtnIcon}>▶</Text>
          <Text style={[styles.sessionBtnText, { color }]}>Start Homework Session</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const { tasks, updateHoursPerDay, updateEstimatedHours } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // date key → tasks due that day
  const dueMap = useMemo(() => {
    const m: Record<string, Task[]> = {};
    tasks.forEach(t => {
      const k = taskDueKey(t);
      (m[k] ??= []).push(t);
    });
    return m;
  }, [tasks]);

  // date key → tasks that should be studied that day (counting back from due)
  const studyMap = useMemo(() => {
    const m: Record<string, Task[]> = {};
    tasks.forEach(t => {
      const due = new Date(t.dueDateRaw);
      const n = Math.ceil(t.estimatedHours / t.hoursPerDay);
      for (let i = 0; i < n; i++) {
        const d = new Date(due);
        d.setDate(d.getDate() - i);
        const k = toKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (!(m[k] ??= []).includes(t)) m[k].push(t);
      }
    });
    return m;
  }, [tasks]);

  // Build grid weeks
  const weeks = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const flat: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: dim }, (_, i) => i + 1),
    ];
    while (flat.length % 7 !== 0) flat.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));
    return rows;
  }, [viewYear, viewMonth]);

  const tk = todayKey();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const selectedDueTasks = selectedKey ? (dueMap[selectedKey] ?? []) : [];
  const selectedStudyTasks = selectedKey
    ? (studyMap[selectedKey] ?? []).filter(t => !selectedDueTasks.includes(t))
    : [];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Schedule</Text>
      <Text style={styles.headingSub}>Tap a day to see tasks</Text>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarBox}>
        {/* Day-of-week header */}
        <View style={styles.dowRow}>
          {DOW.map(d => <Text key={d} style={styles.dowText}>{d}</Text>)}
        </View>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.emptyCell} />;

              const key = toKey(viewYear, viewMonth, day);
              const isToday = key === tk;
              const isSelected = key === selectedKey;
              const dueTasks = dueMap[key] ?? [];
              const studyTasks = (studyMap[key] ?? []).filter(t => !dueTasks.includes(t));
              const hasActivity = dueTasks.length > 0 || studyTasks.length > 0;

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.cell,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={() => setSelectedKey(isSelected ? null : key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellDay,
                    isToday && styles.cellDayToday,
                    isSelected && styles.cellDaySelected,
                  ]}>
                    {day}
                  </Text>

                  {/* Dots row */}
                  <View style={styles.dotsRow}>
                    {dueTasks.slice(0, 3).map(t => (
                      <View key={t.id} style={[styles.dueDot, { backgroundColor: hourColor(t.estimatedHours) }]} />
                    ))}
                    {studyTasks.slice(0, 2).map(t => (
                      <View key={t.id} style={[styles.studyDot, { borderColor: hourColor(t.estimatedHours) }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dueDot, { backgroundColor: '#aaa' }]} />
          <Text style={styles.legendText}>Due date</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.studyDot, { borderColor: '#aaa' }]} />
          <Text style={styles.legendText}>Study day</Text>
        </View>
        {[
          { color: '#22C55E', label: 'Light < 2h' },
          { color: '#F59E0B', label: 'Moderate 2–5h' },
          { color: '#EF4444', label: 'Heavy 5h+' },
        ].map(({ color, label }) => (
          <View key={color} style={styles.legendItem}>
            <View style={[styles.dueDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Selected day panel */}
      {selectedKey && (
        <View style={styles.dayPanel}>
          <Text style={styles.dayPanelTitle}>
            {new Date(selectedKey + 'T12:00:00').toLocaleDateString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>

          {selectedDueTasks.length === 0 && selectedStudyTasks.length === 0 ? (
            <Text style={styles.nothingText}>Nothing scheduled here.</Text>
          ) : (
            <>
              {selectedDueTasks.length > 0 && (
                <>
                  <Text style={styles.dayPanelSection}>Due today</Text>
                  {selectedDueTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      styles={styles}
                      onAdjust={delta => updateHoursPerDay(task.id, Math.round((task.hoursPerDay + delta) * 2) / 2)}
                      onAdjustTotal={delta => updateEstimatedHours(task.id, Math.round((task.estimatedHours + delta) * 2) / 2)}
                      onFocus={() => router.push(`/focus?id=${task.id}`)}
                    />
                  ))}
                </>
              )}
              {selectedStudyTasks.length > 0 && (
                <>
                  <Text style={styles.dayPanelSection}>Study session</Text>
                  {selectedStudyTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      styles={styles}
                      onAdjust={delta => updateHoursPerDay(task.id, Math.round((task.hoursPerDay + delta) * 2) / 2)}
                      onAdjustTotal={delta => updateEstimatedHours(task.id, Math.round((task.estimatedHours + delta) * 2) / 2)}
                      onFocus={() => router.push(`/focus?id=${task.id}`)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 60 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.text, marginBottom: 4, letterSpacing: -0.3 },

  headingSub: { color: theme.muted, fontSize: 13, fontWeight: '500', marginBottom: 20 },

  // Month nav
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: theme.primary, fontWeight: '300' },
  monthTitle: { fontSize: 18, fontWeight: '700', color: theme.text },

  // Calendar box
  calendarBox: { backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: theme.border },
  dowRow: { flexDirection: 'row', backgroundColor: theme.surfaceAlt, paddingVertical: 8 },
  dowText: { flex: 1, textAlign: 'center', color: theme.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  weekRow: { flexDirection: 'row' },

  // Cells
  emptyCell: { flex: 1, height: 62 },
  cell: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  cellToday: { backgroundColor: theme.surfaceAlt },
  cellSelected: { backgroundColor: theme.primary },
  cellDay: { fontSize: 14, color: theme.text, fontWeight: '500', marginBottom: 4 },
  cellDayToday: { color: theme.primary, fontWeight: '800' },
  cellDaySelected: { color: theme.onPrimary, fontWeight: '800' },

  // Dots
  dotsRow: { flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 2 },
  dueDot: { width: 7, height: 7, borderRadius: 4 },
  studyDot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, backgroundColor: 'transparent' },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: '#666', fontSize: 11 },

  // Day panel
  dayPanel: { marginTop: 4 },
  dayPanelTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  dayPanelSection: {
    color: '#555', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  nothingText: { color: '#444', fontSize: 14, textAlign: 'center', marginTop: 20 },

  // Task card
  card: { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitles: { flex: 1, marginRight: 12 },
  cardAssignment: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardClass: { color: '#888', fontSize: 13 },
  cardDescription: { color: '#999', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  workloadBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  workloadLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  workloadHours: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  dueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dueText: { color: '#aaa', fontSize: 13 },
  daysLeft: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#2e2e2e', marginBottom: 14 },
  sectionLabel: { color: '#666', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  adjusterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  adjBtn: { backgroundColor: '#2e2e2e', width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  adjBtnText: { color: '#fff', fontSize: 22, fontWeight: '300' },
  hoursCenter: { alignItems: 'center' },
  hoursNumber: { fontSize: 32, fontWeight: 'bold' },
  hoursSubtext: { color: '#666', fontSize: 12, marginTop: 2 },
  statusBar: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  statusText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg: { flex: 1, height: 6, backgroundColor: '#2e2e2e', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { color: '#555', fontSize: 11, minWidth: 50, textAlign: 'right' },
  sessionBtnWrap: { marginTop: 16 },
  sessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: '#0f0f0f',
  },
  sessionBtnIcon: { fontSize: 15, color: '#fff' },
  sessionBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
