import { Task, TaskProgress, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { ThemeButton, ThemeCard } from '@/components/ui/design-system';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PROGRESS_STEPS: TaskProgress[] = ['Not started', 'Working', 'Almost done', 'Done'];

function daysUntil(raw: string): number {
  return Math.max(0, Math.ceil((new Date(raw).getTime() - Date.now()) / 86400000));
}

function urgencyColor(hours: number): string {
  if (hours < 2) return '#22C55E';
  if (hours < 5) return '#F59E0B';
  return '#EF4444';
}

function progressColor(progress?: TaskProgress): string {
  if (progress === 'Done') return '#22C55E';
  if (progress === 'Almost done') return '#F59E0B';
  if (progress === 'Working') return '#6C63FF';
  return '#94A3B8';
}

function nextProgress(progress?: TaskProgress): TaskProgress {
  const current = PROGRESS_STEPS.indexOf(progress ?? 'Not started');
  return PROGRESS_STEPS[(current + 1) % PROGRESS_STEPS.length];
}

function AssignmentCard({
  task,
  onFocus,
  onProgress,
  onToggleStep,
  styles,
}: {
  task: Task;
  onFocus: () => void;
  onProgress: () => void;
  onToggleStep: (stepId: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const days = daysUntil(task.dueDateRaw);
  const workloadColor = urgencyColor(task.estimatedHours);
  const progress = task.progress ?? 'Not started';
  const statusColor = progressColor(progress);
  const steps = task.steps ?? [];
  const doneSteps = steps.filter(step => step.done).length;

  return (
    <ThemeCard style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitles}>
          <Text style={styles.cardAssignment} numberOfLines={1}>{task.assignmentName}</Text>
          <Text style={styles.cardClass}>{task.className}</Text>
        </View>
        <View style={[styles.hourPill, { backgroundColor: workloadColor + '20' }]}>
          <Text style={[styles.hourPillText, { color: workloadColor }]}>{task.estimatedHours}h</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View style={[styles.workloadDot, { backgroundColor: workloadColor }]} />
          <Text style={styles.cardDue}>Due {task.dueDate}</Text>
        </View>
        <Text style={[styles.cardDays, { color: days <= 1 ? '#EF4444' : days <= 2 ? '#F59E0B' : '#667085' }]}>
          {days === 0 ? 'Due today' : days === 1 ? '1 day left' : `${days} days left`}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <ThemeButton fullWidth onPress={onFocus}>Start focus</ThemeButton>
        <ThemeButton variant="secondary" onPress={onProgress} textStyle={{ color: statusColor }}>
          {progress}
        </ThemeButton>
      </View>

      {steps.length > 0 && (
        <View style={styles.breakdownBox}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.sectionMiniTitle}>Breakdown</Text>
            <Text style={styles.breakdownCount}>{doneSteps}/{steps.length}</Text>
          </View>
          {steps.map(step => (
            <TouchableOpacity key={step.id} style={styles.stepRow} onPress={() => onToggleStep(step.id)} activeOpacity={0.8}>
              <View style={[styles.stepCheck, step.done && styles.stepCheckDone]}>
                <Text style={styles.stepCheckText}>{step.done ? '✓' : ''}</Text>
              </View>
              <Text style={[styles.stepText, step.done && styles.stepTextDone]}>{step.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!!task.studyPlan?.length && (
        <View style={styles.planBox}>
          <Text style={styles.sectionMiniTitle}>Study plan</Text>
          {task.studyPlan.slice(0, 3).map(item => (
            <View key={item.id} style={styles.planRow}>
              <Text style={styles.planDate}>{item.dateLabel}</Text>
              <View style={styles.planTextWrap}>
                <Text style={styles.planFocus}>{item.focus}</Text>
                <Text style={styles.planMinutes}>{item.minutes} min</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ThemeCard>
  );
}

export default function SinglePlayerScreen() {
  const router = useRouter();
  const { tasks, updateProgress, toggleTaskStep } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  const urgentCount = tasks.filter(task => daysUntil(task.dueDateRaw) <= 2 && task.progress !== 'Done').length;
  const doneCount = tasks.filter(task => task.progress === 'Done').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Solo study</Text>
          <Text style={styles.greeting}>Assignments</Text>
          <Text style={styles.date}>Pick one assignment, then start a focus session.</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{tasks.length}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalHours}h</Text>
          <Text style={styles.statLabel}>hours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, urgentCount > 0 && styles.statUrgent]}>{urgentCount}</Text>
          <Text style={styles.statLabel}>urgent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{doneCount}</Text>
          <Text style={styles.statLabel}>done</Text>
        </View>
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyLine} />
          <Text style={styles.emptyTitle}>No assignments yet</Text>
          <Text style={styles.emptySub}>Drop in one real task. The next screen can estimate the time and send you straight to focus.</Text>
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewLabel}>Example</Text>
            <Text style={styles.emptyPreviewTitle}>Read chapter 4 before lab</Text>
            <Text style={styles.emptyPreviewMeta}>45m estimate - study tonight</Text>
          </View>
        </View>
      ) : (
        <View style={styles.queueArea}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>Focus queue</Text>
            <Text style={styles.queueHint}>Top task first</Text>
          </View>
          <FlatList
            data={tasks}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <AssignmentCard
                task={item}
                styles={styles}
                onFocus={() => router.push(`/focus?id=${item.id}`)}
                onProgress={() => updateProgress(item.id, nextProgress(item.progress))}
                onToggleStep={stepId => toggleTaskStep(item.id, stepId)}
              />
            )}
          />
        </View>
      )}

      <View style={styles.bottomBar}>
        <ThemeButton fullWidth size="lg" variant="secondary" style={styles.autoBtn} onPress={() => router.push('/auto-add')}>
          Estimate from photo
        </ThemeButton>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-task')} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  kicker: { color: theme.school ? theme.secondary : theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.35, marginBottom: 5, textTransform: 'uppercase' },
  greeting: { fontSize: 26, fontWeight: '700', color: theme.text },
  date: { fontSize: 13, color: theme.muted, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  countPill: { backgroundColor: theme.surfaceAlt, borderRadius: 18, minWidth: 40, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border },
  countPillText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, paddingVertical: 10, marginBottom: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.text, fontSize: 20, fontWeight: '700' },
  statUrgent: { color: '#EF4444' },
  statLabel: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, backgroundColor: theme.border },
  queueArea: { flex: 1 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  queueTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  queueHint: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 108 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitles: { flex: 1, marginRight: 10 },
  cardAssignment: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardClass: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  hourPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  hourPillText: { fontSize: 13, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  workloadDot: { width: 8, height: 8, borderRadius: 4 },
  cardDue: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  cardDays: { fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  focusButton: {
    flex: 1,
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: theme.school ? theme.secondary : theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  focusButtonText: { color: theme.school ? theme.background : theme.onPrimary, fontSize: 14, fontWeight: '700' },
  progressButton: { borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt, paddingHorizontal: 12, paddingVertical: 13 },
  progressButtonText: { fontSize: 12, fontWeight: '700' },
  breakdownBox: { backgroundColor: theme.surfaceAlt, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginTop: 12, padding: 12 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionMiniTitle: { color: theme.text, fontSize: 13, fontWeight: '700' },
  breakdownCount: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  stepCheck: { width: 22, height: 22, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  stepCheckDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  stepCheckText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, color: theme.text, fontSize: 13, fontWeight: '700' },
  stepTextDone: { color: theme.muted, textDecorationLine: 'line-through' },
  planBox: { backgroundColor: theme.surfaceAlt, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginTop: 10, padding: 12, gap: 8 },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  planDate: { width: 66, color: theme.school ? theme.secondary : theme.accent, fontSize: 12, fontWeight: '700' },
  planTextWrap: { flex: 1 },
  planFocus: { color: theme.text, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  planMinutes: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 92 },
  emptyLine: { width: 46, height: 4, borderRadius: 999, backgroundColor: theme.school ? theme.secondary : theme.primary, marginBottom: 18 },
  emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: theme.muted, fontSize: 15, lineHeight: 22, maxWidth: 310 },
  emptyPreview: { marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 14 },
  emptyPreviewLabel: { color: theme.school ? theme.secondary : theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  emptyPreviewTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyPreviewMeta: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border },
  autoBtn: { flex: 1, marginRight: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center' },
  autoBtnText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  fab: { width: 56, height: 56, borderRadius: 20, backgroundColor: theme.school ? theme.secondary : theme.primary, alignItems: 'center', justifyContent: 'center', shadowColor: theme.school ? theme.secondary : theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  fabIcon: { color: '#ffffff', fontSize: 26, fontWeight: '300', lineHeight: 34, marginTop: -2 },
});
