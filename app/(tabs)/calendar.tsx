import { signedDaysUntil, Task, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { GOLD, PIXEL_FONT, PixelButton, PixelField, PixelPanel } from '@/components/pixel-ui';
import ArcadeTabScreen from '@/components/ArcadeTabScreen';
import PixelBackdrop from '@/components/PixelBackdrop';
import { PixelSkyStrip } from '@/components/PixelWorld';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SCHEDULE_KEY = 'antiprocrastination.schedule.v1';

type ScheduleItem = {
  id: string;
  type: 'class' | 'event';
  title: string;
  dateKey: string;
  time: string;
  location: string;
  notes: string;
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const EVENT_PINK = '#EC4899';
const DANGER_RED = '#EF4444';

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
  if (h < 5) return GOLD;
  return DANGER_RED;
}

function hourLabel(h: number) {
  if (h < 2) return 'Quick';
  if (h < 5) return 'Medium';
  return 'Long';
}

function daysUntil(dueDateRaw: string) {
  return Math.max(0, Math.ceil(
    (new Date(dueDateRaw).getTime() - Date.now()) / 86400000
  ));
}

// Task card shown below the calendar when a day is selected.
function TaskCard({
  task, onFocus, onDelete, styles,
}: {
  task: Task;
  onFocus: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const color = hourColor(task.estimatedHours);
  const days = daysUntil(task.dueDateRaw);
  const daysLate = task.progress !== 'Done' ? -signedDaysUntil(task.dueDateRaw) : 0;

  return (
    <PixelPanel tone="alt" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.cardAssignment}>{task.assignmentName}</Text>
          <Text style={styles.cardClass}>{task.className}</Text>
        </View>
        <View style={[styles.workloadBadge, { borderColor: color }]}>
          <Text style={[styles.workloadLabel, { color }]}>{hourLabel(task.estimatedHours)}</Text>
          <Text style={[styles.workloadHours, { color }]}>{task.estimatedHours}h</Text>
        </View>
      </View>

      {!!task.description && <Text style={styles.cardDescription}>{task.description}</Text>}

      <View style={styles.simpleTaskMeta}>
        <View style={styles.metaLeft}>
          <View style={[styles.workloadDot, { backgroundColor: color }]} />
          <Text style={styles.simpleTaskText}>Due {task.dueDate}</Text>
        </View>
        <Text style={[styles.daysLeft, { color: daysLate > 0 || days <= 1 ? DANGER_RED : days <= 3 ? GOLD : color }]}>
          {daysLate > 0
            ? `${daysLate} day${daysLate === 1 ? '' : 's'} late`
            : days === 0 ? 'Due today' : days === 1 ? '1 day left' : `${days} days left`}
        </Text>
      </View>

      <View style={styles.taskActions}>
        <PixelButton style={styles.taskActionFlex} onPress={onFocus}>Start focus</PixelButton>
        <PixelButton variant="danger" onPress={onDelete}>Delete</PixelButton>
      </View>
    </PixelPanel>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { tasks, deleteTask } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [scheduleHydrated, setScheduleHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SCHEDULE_KEY)
      .then(saved => {
        if (saved) setScheduleItems(JSON.parse(saved));
      })
      .catch(() => {})
      .finally(() => setScheduleHydrated(true));
  }, []);

  useEffect(() => {
    if (!scheduleHydrated) return;
    AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleItems)).catch(() => {});
  }, [scheduleItems, scheduleHydrated]);
  const [formType, setFormType] = useState<'class' | 'event' | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDate, setItemDate] = useState(todayKey());
  const [itemTime, setItemTime] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemNotes, setItemNotes] = useState('');

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
  const selectedScheduleItems = selectedKey ? scheduleItems.filter(item => item.dateKey === selectedKey) : [];

  const openScheduleForm = (type: 'class' | 'event') => {
    setFormType(type);
    setItemTitle('');
    setItemDate(selectedKey ?? todayKey());
    setItemTime('');
    setItemLocation('');
    setItemNotes('');
  };

  const addScheduleItem = () => {
    if (!formType || !itemTitle.trim() || !itemDate.trim()) return;

    setScheduleItems(current => [
      ...current,
      {
        id: `${formType}-${Date.now()}`,
        type: formType,
        title: itemTitle.trim(),
        dateKey: itemDate.trim(),
        time: itemTime.trim(),
        location: itemLocation.trim(),
        notes: itemNotes.trim(),
      },
    ]);
    setSelectedKey(itemDate.trim());
    setFormType(null);
  };

  const confirmDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete assignment?',
      `Remove ${task.assignmentName} from your schedule?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete assignment', style: 'destructive', onPress: () => deleteTask(task.id) },
      ],
    );
  };

  return (
    <ArcadeTabScreen index={3} style={styles.root}>
      <PixelBackdrop />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <PixelSkyStrip height={132} style={styles.sky}>
        <View style={styles.skyContent}>
          <Text style={styles.kicker}>This month</Text>
          <Text style={styles.heading}>Schedule</Text>
          <Text style={styles.headingSub}>Classes, events, and due dates.</Text>
        </View>
      </PixelSkyStrip>

      <View style={styles.body}>
        <View style={styles.actionRow}>
          <PixelButton style={styles.actionFlex} size="lg" onPress={() => openScheduleForm('class')}>
            Add class
          </PixelButton>
          <PixelButton style={styles.actionFlex} size="lg" variant="surface" onPress={() => openScheduleForm('event')}>
            Add event
          </PixelButton>
        </View>

        {!!formType && (
          <PixelPanel style={styles.scheduleForm}>
            <Text style={styles.formTitle}>{formType === 'class' ? 'Add class' : 'Add event'}</Text>
            <PixelField
              value={itemTitle}
              onChangeText={setItemTitle}
              placeholder={formType === 'class' ? 'Class name' : 'Event name'}
              containerStyle={styles.fieldGap}
            />
            <PixelField
              value={itemDate}
              onChangeText={setItemDate}
              placeholder="Date, like 2026-05-10"
              containerStyle={styles.fieldGap}
            />
            <PixelField
              value={itemTime}
              onChangeText={setItemTime}
              placeholder="Time, like 2:30 PM"
              containerStyle={styles.fieldGap}
            />
            <PixelField
              value={itemLocation}
              onChangeText={setItemLocation}
              placeholder="Location, like Library 2A"
              containerStyle={styles.fieldGap}
            />
            <PixelField
              value={itemNotes}
              onChangeText={setItemNotes}
              placeholder="Notes, optional"
              containerStyle={styles.fieldGap}
              multiline
            />
            <View style={styles.formButtons}>
              <PixelButton style={styles.actionFlex} variant="surface" onPress={() => setFormType(null)}>
                Cancel
              </PixelButton>
              <PixelButton style={styles.actionFlex} onPress={addScheduleItem}>
                {formType === 'class' ? 'Save class' : 'Save event'}
              </PixelButton>
            </View>
          </PixelPanel>
        )}

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={prevMonth}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Text style={styles.navArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={nextMonth}
            accessibilityLabel="Next month"
            accessibilityRole="button"
          >
            <Text style={styles.navArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <PixelPanel padding={8} style={styles.calendarBox}>
          <View style={styles.dowRow}>
            {DOW.map(d => <Text key={d} style={styles.dowText}>{d}</Text>)}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={styles.emptyCell} />;

                const key = toKey(viewYear, viewMonth, day);
                const isToday = key === tk;
                const isSelected = key === selectedKey;
                const dueTasks = dueMap[key] ?? [];
                const studyTasks = (studyMap[key] ?? []).filter(t => !dueTasks.includes(t));
                const dayScheduleItems = scheduleItems.filter(item => item.dateKey === key);
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
                      (isToday || isSelected) && styles.cellDayHighlight,
                    ]}>
                      {day}
                    </Text>

                    <View style={styles.dotsRow}>
                      {dueTasks.slice(0, 3).map(t => (
                        <View key={t.id} style={[styles.dueDot, { backgroundColor: hourColor(t.estimatedHours) }]} />
                      ))}
                      {studyTasks.slice(0, 2).map(t => (
                        <View key={t.id} style={[styles.studyDot, { borderColor: hourColor(t.estimatedHours) }]} />
                      ))}
                      {dayScheduleItems.slice(0, 2).map(item => (
                        <View
                          key={item.id}
                          style={[styles.dueDot, { backgroundColor: item.type === 'class' ? theme.secondary : EVENT_PINK }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </PixelPanel>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dueDot, { backgroundColor: theme.muted }]} />
            <Text style={styles.legendText}>Due date</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.studyDot, { borderColor: theme.muted }]} />
            <Text style={styles.legendText}>Study day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dueDot, { backgroundColor: theme.secondary }]} />
            <Text style={styles.legendText}>Class</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dueDot, { backgroundColor: EVENT_PINK }]} />
            <Text style={styles.legendText}>Event</Text>
          </View>
        </View>

        {/* Selected day panel */}
        {selectedKey && (
          <PixelPanel style={styles.dayPanel}>
            <Text style={styles.dayPanelTitle}>
              {new Date(selectedKey + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </Text>

            {selectedDueTasks.length === 0 && selectedStudyTasks.length === 0 && selectedScheduleItems.length === 0 ? (
              <View>
                <Text style={styles.emptyDayTitle}>No plans on this day</Text>
                <Text style={styles.emptyDayText}>Add a class, event, or study block.</Text>
                <View style={styles.emptyDayActions}>
                  <PixelButton style={styles.actionFlex} variant="surface" onPress={() => openScheduleForm('class')}>
                    Add class
                  </PixelButton>
                  <PixelButton style={styles.actionFlex} variant="surface" onPress={() => openScheduleForm('event')}>
                    Add event
                  </PixelButton>
                </View>
              </View>
            ) : (
              <>
                {selectedScheduleItems.length > 0 && (
                  <>
                    <Text style={styles.dayPanelSection}>Classes and events</Text>
                    {selectedScheduleItems.map(item => (
                      <View key={item.id} style={styles.scheduleItemCard}>
                        <Text style={[styles.scheduleItemType, { color: item.type === 'class' ? theme.secondary : EVENT_PINK }]}>
                          {item.type === 'class' ? 'Class' : 'Event'}
                        </Text>
                        <Text style={styles.scheduleItemTitle}>{item.title}</Text>
                        {!!item.time && <Text style={styles.scheduleItemMeta}>{item.time}</Text>}
                        {!!item.location && <Text style={styles.scheduleItemMeta}>{item.location}</Text>}
                        {!!item.notes && <Text style={styles.scheduleItemNotes}>{item.notes}</Text>}
                      </View>
                    ))}
                  </>
                )}
                {selectedDueTasks.length > 0 && (
                  <>
                    <Text style={styles.dayPanelSection}>Due today</Text>
                    {selectedDueTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        styles={styles}
                        onFocus={() => router.push(`/focus?id=${task.id}`)}
                        onDelete={() => confirmDeleteTask(task)}
                      />
                    ))}
                  </>
                )}
                {selectedStudyTasks.length > 0 && (
                  <>
                    <Text style={styles.dayPanelSection}>Planned study</Text>
                    {selectedStudyTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        styles={styles}
                        onFocus={() => router.push(`/focus?id=${task.id}`)}
                        onDelete={() => confirmDeleteTask(task)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </PixelPanel>
        )}
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
  body: { paddingHorizontal: 18 },
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
  headingSub: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  actionFlex: { flex: 1 },
  scheduleForm: { marginBottom: 18 },
  formTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  fieldGap: { marginBottom: 10 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  navBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 8 },
  navArrow: { fontSize: 22, color: theme.primary, fontWeight: '800', fontFamily: PIXEL_FONT },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    color: theme.text,
    textTransform: 'uppercase',
  },

  calendarBox: { marginBottom: 12 },
  dowRow: { flexDirection: 'row', paddingVertical: 8 },
  dowText: {
    flex: 1,
    textAlign: 'center',
    color: theme.muted,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    textTransform: 'uppercase',
  },
  weekRow: { flexDirection: 'row' },

  emptyCell: { flex: 1, height: 56 },
  cell: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  cellToday: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
  },
  cellSelected: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
  },
  cellDay: { fontSize: 13, color: theme.text, fontWeight: '600', fontFamily: PIXEL_FONT, marginBottom: 4 },
  cellDayHighlight: { color: theme.primary, fontWeight: '800' },

  dotsRow: { flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 2 },
  dueDot: { width: 6, height: 6 },
  studyDot: { width: 6, height: 6, borderWidth: 1.5, backgroundColor: 'transparent' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: theme.muted, fontSize: 11, fontWeight: '600' },

  dayPanel: { marginTop: 4 },
  dayPanelTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    marginBottom: 12,
  },
  dayPanelSection: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  emptyDayTitle: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  emptyDayText: { color: theme.muted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  emptyDayActions: { flexDirection: 'row', gap: 10 },
  scheduleItemCard: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 12,
  },
  scheduleItemType: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scheduleItemTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scheduleItemMeta: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  scheduleItemNotes: { color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },

  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitles: { flex: 1, marginRight: 12 },
  cardAssignment: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardClass: { color: theme.muted, fontSize: 13 },
  cardDescription: { color: theme.muted, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  workloadBadge: {
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  workloadLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workloadHours: { fontSize: 13, fontWeight: '800', fontFamily: PIXEL_FONT, marginTop: 1 },
  daysLeft: { fontSize: 12, fontWeight: '800', fontFamily: PIXEL_FONT },
  simpleTaskMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 2 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  workloadDot: { width: 8, height: 8 },
  simpleTaskText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  taskActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  taskActionFlex: { flex: 1 },
});
