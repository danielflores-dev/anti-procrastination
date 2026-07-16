import { Task, TaskProgress, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { GOLD, PIXEL_FONT, PixelBadge, PixelButton, PixelHeading, PixelPanel } from '@/components/pixel-ui';
import ArcadeTabScreen from '@/components/ArcadeTabScreen';
import PixelBackdrop from '@/components/PixelBackdrop';
import { PixelSkyStrip } from '@/components/PixelWorld';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PROGRESS_STEPS: TaskProgress[] = ['Not started', 'Working', 'Almost done', 'Done'];
const DONE_GREEN = '#22C55E';

function daysUntil(raw: string): number {
  return Math.max(0, Math.ceil((new Date(raw).getTime() - Date.now()) / 86400000));
}

function urgencyColor(hours: number): string {
  if (hours < 2) return DONE_GREEN;
  if (hours < 5) return GOLD;
  return '#EF4444';
}

function progressColor(progress?: TaskProgress): string {
  if (progress === 'Done') return DONE_GREEN;
  if (progress === 'Almost done') return GOLD;
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
  onEdit,
  justDone,
  styles,
}: {
  task: Task;
  onFocus: () => void;
  onProgress: () => void;
  onEdit: () => void;
  justDone?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const days = daysUntil(task.dueDateRaw);
  const workloadColor = urgencyColor(task.estimatedHours);
  const progress = task.progress ?? 'Not started';
  const statusColor = progressColor(progress);

  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!justDone) return;
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.7);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(celebrateOpacity, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(celebrateScale, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
      Animated.timing(celebrateOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [justDone, celebrateOpacity, celebrateScale]);

  return (
    <PixelPanel style={styles.cardRim} padding={14}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitles}>
          <Text style={styles.cardAssignment} numberOfLines={1}>{task.assignmentName}</Text>
          <Text style={styles.cardClass}>{task.className}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Edit ${task.assignmentName}`}
          accessibilityRole="button"
        >
          <FontAwesome5 name="pen" size={11} color={styles.cardClass.color} />
        </TouchableOpacity>
        {task.isExam && (
          <View style={styles.examTag}>
            <Text style={styles.examTagText}>EXAM</Text>
          </View>
        )}
        <View style={[styles.hourBlock, { borderColor: workloadColor }]}>
          <Text style={[styles.hourBlockText, { color: workloadColor }]}>{task.estimatedHours}h</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View style={[styles.workloadDot, { backgroundColor: workloadColor }]} />
          <Text style={styles.cardDue}>Due {task.dueDate}</Text>
        </View>
        <Text style={[styles.cardDays, { color: days <= 1 ? '#EF4444' : days <= 2 ? GOLD : styles.cardDue.color }]}>
          {days === 0 ? 'Due today' : days === 1 ? '1 day left' : `${days} days left`}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <PixelButton style={styles.actionFlex} onPress={onFocus}>Start focus</PixelButton>
        <PixelButton variant="surface" onPress={onProgress} textStyle={{ color: statusColor }}>
          {progress}
        </PixelButton>
      </View>

      <Animated.View
        style={[styles.doneOverlay, { opacity: celebrateOpacity, transform: [{ scale: celebrateScale }] }]}
        pointerEvents="none"
      >
        <FontAwesome5 name="check-circle" size={22} color={DONE_GREEN} />
        <Text style={styles.doneOverlayText}>Done!</Text>
      </Animated.View>
    </PixelPanel>
  );
}

export default function SinglePlayerScreen() {
  const router = useRouter();
  const { tasks, updateProgress } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [justDoneId, setJustDoneId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const openTasks = tasks.filter(task => task.progress !== 'Done');
  const doneTasks = tasks.filter(task => task.progress === 'Done');
  const urgentCount = openTasks.filter(task => daysUntil(task.dueDateRaw) <= 2).length;

  const handleProgress = (taskId: string, current: TaskProgress | undefined) => {
    const next = nextProgress(current);
    updateProgress(taskId, next);
    if (next === 'Done') {
      setJustDoneId(taskId);
      setTimeout(() => setJustDoneId(null), 900);
    }
  };

  const doneSection = doneTasks.length > 0 ? (
    <View style={styles.doneSection}>
      <TouchableOpacity
        style={styles.doneSectionToggle}
        onPress={() => setShowDone(v => !v)}
        activeOpacity={0.85}
        accessibilityLabel={showDone ? 'Hide done assignments' : `Show ${doneTasks.length} done assignment${doneTasks.length === 1 ? '' : 's'}`}
        accessibilityRole="button"
      >
        <FontAwesome5
          name={showDone ? 'chevron-down' : 'chevron-right'}
          size={11}
          color={theme.muted}
        />
        <Text style={styles.doneSectionTitle}>Done</Text>
        <Text style={styles.doneSectionCount}>{doneTasks.length}</Text>
      </TouchableOpacity>

      {showDone && doneTasks.map(task => (
        <AssignmentCard
          key={task.id}
          task={task}
          styles={styles}
          onFocus={() => router.push(`/focus?id=${task.id}`)}
          onProgress={() => handleProgress(task.id, task.progress)}
          onEdit={() => router.push(`/add-task?id=${task.id}`)}
        />
      ))}
    </View>
  ) : null;

  return (
    <ArcadeTabScreen index={1} style={styles.container}>
      <PixelBackdrop />
      <PixelSkyStrip height={132}>
        <View style={styles.skyContent}>
          <View style={styles.skyRow}>
            <View>
              <Text style={styles.kicker}>Work</Text>
              <Text style={styles.greeting}>Assignments</Text>
              <Text style={styles.date}>What needs focus.</Text>
            </View>
            <PixelBadge>{`${tasks.length}`}</PixelBadge>
          </View>
        </View>
      </PixelSkyStrip>

      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No assignments yet</Text>
          <Text style={styles.emptySub}>Add the next thing due.</Text>
          <View style={styles.emptyActions}>
            <PixelButton size="lg" onPress={() => router.push('/add-task')}>
              Add assignment
            </PixelButton>
            <PixelButton size="lg" variant="surface" onPress={() => router.push('/auto-add')}>
              Try the photo demo
            </PixelButton>
          </View>
        </View>
      ) : (
        <View style={styles.queueArea}>
          <View style={styles.queueHeader}>
            <PixelHeading>Queue</PixelHeading>
            <Text style={styles.queueHint}>
              {urgentCount > 0 ? `${urgentCount} urgent` : doneTasks.length > 0 ? `${doneTasks.length} done` : 'All on track'}
            </Text>
          </View>
          <FlatList
            data={openTasks}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={doneSection}
            renderItem={({ item }) => (
              <AssignmentCard
                task={item}
                styles={styles}
                justDone={item.id === justDoneId}
                onFocus={() => router.push(`/focus?id=${item.id}`)}
                onProgress={() => handleProgress(item.id, item.progress)}
                onEdit={() => router.push(`/add-task?id=${item.id}`)}
              />
            )}
          />
        </View>
      )}

      <View style={styles.bottomBar}>
        <PixelButton
          variant="surface"
          size="lg"
          style={styles.autoBtn}
          onPress={() => router.push('/auto-add')}
        >
          Plan from photo
        </PixelButton>
        <PixelButton
          size="lg"
          style={styles.fab}
          onPress={() => router.push('/add-task')}
          accessibilityLabel="Add assignment manually"
          textStyle={styles.fabIcon}
        >
          +
        </PixelButton>
      </View>
    </ArcadeTabScreen>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  skyContent: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  skyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
  greeting: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  date: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  queueArea: { flex: 1 },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  queueHint: { color: theme.muted, fontSize: 12, fontWeight: '700', fontFamily: PIXEL_FONT },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 108 },
  cardRim: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitles: { flex: 1, marginRight: 10 },
  cardAssignment: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  cardClass: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  editBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  examTag: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 8,
    borderRadius: 2,
  },
  examTagText: {
    color: '#FEE2E2',
    fontSize: 9,
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
  },
  hourBlock: {
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hourBlockText: { fontSize: 13, fontWeight: '800', fontFamily: PIXEL_FONT },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  workloadDot: { width: 8, height: 8 },
  cardDue: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  cardDays: { fontSize: 12, fontWeight: '800', fontFamily: PIXEL_FONT },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionFlex: { flex: 1 },
  doneOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: `${DONE_GREEN}14`,
  },
  doneOverlayText: {
    color: DONE_GREEN,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  doneSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 4,
  },
  doneSectionToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 10,
  },
  doneSectionTitle: {
    flex: 1,
    color: theme.muted,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  doneSectionCount: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: PIXEL_FONT,
    minWidth: 22,
    textAlign: 'right',
  },
  emptyState: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 92 },
  emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: theme.muted, fontSize: 15, lineHeight: 22, maxWidth: 310 },
  emptyActions: { gap: 12, marginTop: 22 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  autoBtn: { flex: 1 },
  fab: { width: 58 },
  fabIcon: { fontSize: 24, fontWeight: '400', lineHeight: 26 },
});
