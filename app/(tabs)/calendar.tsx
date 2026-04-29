import { Task, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
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

      {!!task.description && <Text style={styles.cardDescription}>{task.description}</Text>}

      <View style={styles.simpleTaskMeta}>
        <Text style={styles.simpleTaskText}>Due {task.dueDate}</Text>
        <Text style={[styles.daysLeft, { color: days <= 1 ? '#EF4444' : days <= 3 ? '#F59E0B' : color }]}>
          {days === 0 ? 'Due today' : days === 1 ? '1 day left' : `${days} days left`}
        </Text>
      </View>

      <View style={styles.taskActions}>
        <TouchableOpacity style={styles.focusBtn} onPress={onFocus}>
          <Text style={styles.focusBtnText}>Start focus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
// Main screen ──────────────────────────────────────────────────────────────
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
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
      ],
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Schedule</Text>
      <Text style={styles.headingSub}>Pick a day to see assignments, classes, and events.</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.scheduleAction} onPress={() => openScheduleForm('class')}>
          <Text style={styles.scheduleActionText}>Add class</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scheduleActionSecondary} onPress={() => openScheduleForm('event')}>
          <Text style={styles.scheduleActionSecondaryText}>Add event</Text>
        </TouchableOpacity>
      </View>

      {!!formType && (
        <View style={styles.scheduleForm}>
          <Text style={styles.formTitle}>{formType === 'class' ? 'Add school class' : 'Add special event'}</Text>
          <TextInput
            value={itemTitle}
            onChangeText={setItemTitle}
            placeholder={formType === 'class' ? 'Class name' : 'Event name'}
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
          <TextInput
            value={itemDate}
            onChangeText={setItemDate}
            placeholder="Date as YYYY-MM-DD"
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
          <TextInput
            value={itemTime}
            onChangeText={setItemTime}
            placeholder="Time"
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
          <TextInput
            value={itemLocation}
            onChangeText={setItemLocation}
            placeholder="Location"
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
          <TextInput
            value={itemNotes}
            onChangeText={setItemNotes}
            placeholder="Notes"
            placeholderTextColor={theme.muted}
            style={[styles.input, styles.notesInput]}
            multiline
          />
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelScheduleButton} onPress={() => setFormType(null)}>
              <Text style={styles.cancelScheduleText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveScheduleButton} onPress={addScheduleItem}>
              <Text style={styles.saveScheduleText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                    {dayScheduleItems.slice(0, 2).map(item => (
                      <View key={item.id} style={[styles.scheduleDot, item.type === 'class' ? styles.classDot : styles.eventDot]} />
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
        <View style={styles.legendItem}>
          <View style={[styles.scheduleDot, styles.classDot]} />
          <Text style={styles.legendText}>Class</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.scheduleDot, styles.eventDot]} />
          <Text style={styles.legendText}>Event</Text>
        </View>
      </View>

      {/* Selected day panel */}
      {selectedKey && (
        <View style={styles.dayPanel}>
          <Text style={styles.dayPanelTitle}>
            {new Date(selectedKey + 'T12:00:00').toLocaleDateString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>

          {selectedDueTasks.length === 0 && selectedStudyTasks.length === 0 && selectedScheduleItems.length === 0 ? (
            <Text style={styles.nothingText}>Nothing scheduled here.</Text>
          ) : (
            <>
              {selectedScheduleItems.length > 0 && (
                <>
                  <Text style={styles.dayPanelSection}>Classes and events</Text>
                  {selectedScheduleItems.map(item => (
                    <View key={item.id} style={[styles.scheduleItemCard, item.type === 'class' ? styles.classItemCard : styles.eventItemCard]}>
                      <Text style={styles.scheduleItemType}>{item.type === 'class' ? 'Class' : 'Event'}</Text>
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
                  <Text style={styles.dayPanelSection}>Study session</Text>
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
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  scheduleAction: { flex: 1, backgroundColor: theme.secondary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  scheduleActionText: { color: theme.school ? theme.background : theme.onPrimary, fontSize: 14, fontWeight: '800' },
  scheduleActionSecondary: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingVertical: 12, alignItems: 'center' },
  scheduleActionSecondaryText: { color: theme.text, fontSize: 14, fontWeight: '800' },
  scheduleForm: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 16 },
  formTitle: { color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  notesInput: { minHeight: 74, textAlignVertical: 'top' },
  formButtons: { flexDirection: 'row', gap: 10 },
  cancelScheduleButton: { flex: 1, backgroundColor: theme.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingVertical: 11, alignItems: 'center' },
  cancelScheduleText: { color: theme.text, fontSize: 14, fontWeight: '800' },
  saveScheduleButton: { flex: 1, backgroundColor: theme.secondary, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  saveScheduleText: { color: theme.school ? theme.background : theme.onPrimary, fontSize: 14, fontWeight: '800' },

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
  scheduleDot: { width: 7, height: 7, borderRadius: 4 },
  classDot: { backgroundColor: theme.secondary },
  eventDot: { backgroundColor: '#EC4899' },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: theme.muted, fontSize: 11 },

  // Day panel
  dayPanel: { marginTop: 4, backgroundColor: theme.surfaceAlt, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 12 },
  dayPanelTitle: { color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  dayPanelSection: {
    color: theme.muted, fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  nothingText: { color: theme.muted, fontSize: 14, textAlign: 'center', marginVertical: 18 },
  scheduleItemCard: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10 },
  classItemCard: { borderLeftWidth: 4, borderLeftColor: theme.secondary },
  eventItemCard: { borderLeftWidth: 4, borderLeftColor: '#EC4899' },
  scheduleItemType: { color: theme.secondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  scheduleItemTitle: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scheduleItemMeta: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  scheduleItemNotes: { color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },

  // Task card
  card: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, borderColor: theme.border, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitles: { flex: 1, marginRight: 12 },
  cardAssignment: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardClass: { color: theme.muted, fontSize: 13 },
  cardDescription: { color: theme.muted, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  workloadBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  workloadLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  workloadHours: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  daysLeft: { fontSize: 13, fontWeight: '600' },
  simpleTaskMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 2 },
  simpleTaskText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  taskActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  focusBtn: { flex: 1, backgroundColor: theme.secondary, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  focusBtnText: { color: theme.school ? theme.background : theme.onPrimary, fontSize: 14, fontWeight: '800' },
  deleteBtn: { paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444', paddingVertical: 11, alignItems: 'center' },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
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
