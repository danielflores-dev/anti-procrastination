import { StudySession, Task, TaskProgress, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function urgencyColor(hours: number): string {
  if (hours < 2) return '#22C55E';
  if (hours < 5) return '#F59E0B';
  return '#EF4444';
}

function daysUntil(raw: string): number {
  return Math.max(0, Math.ceil((new Date(raw).getTime() - Date.now()) / 86400000));
}

const PROGRESS_STEPS: TaskProgress[] = ['Not started', 'Working', 'Almost done', 'Done'];

function nextProgress(progress?: TaskProgress): TaskProgress {
  const current = PROGRESS_STEPS.indexOf(progress ?? 'Not started');
  return PROGRESS_STEPS[(current + 1) % PROGRESS_STEPS.length];
}

function formatSessionTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function progressColor(progress?: TaskProgress): string {
  if (progress === 'Done') return '#22C55E';
  if (progress === 'Almost done') return '#F59E0B';
  if (progress === 'Working') return '#6C63FF';
  return '#94A3B8';
}

type SmartSuggestion = {
  task: Task;
  title: string;
  reason: string;
  action: string;
  score: number;
};

type Badge = {
  id: string;
  name: string;
  detail: string;
  unlocked: boolean;
};

function sessionDateKey(dateRaw: string): string {
  const d = new Date(dateRaw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStudyStreak(sessions: StudySession[]): number {
  const studiedDays = new Set(sessions.map(session => sessionDateKey(session.createdAt)));
  let streak = 0;
  const cursor = new Date();

  while (studiedDays.has(sessionDateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildBadges(sessions: StudySession[], tasks: Task[], streak: number): Badge[] {
  const totalCoins = sessions.reduce((sum, session) => sum + session.coinsEarned, 0);
  const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60);
  const hasGroupSession = sessions.some(session => !!session.partyRoom);
  const completedCount = tasks.filter(task => task.progress === 'Done').length;

  return [
    {
      id: 'first-focus',
      name: 'First Focus',
      detail: 'Finish your first focus session.',
      unlocked: sessions.length > 0,
    },
    {
      id: 'three-day-streak',
      name: '3 Day Streak',
      detail: 'Study three days in a row.',
      unlocked: streak >= 3,
    },
    {
      id: 'group-study',
      name: 'Group Study',
      detail: 'Complete a party focus session.',
      unlocked: hasGroupSession,
    },
    {
      id: 'coin-builder',
      name: 'Coin Builder',
      detail: 'Earn 25 coins from studying.',
      unlocked: totalCoins >= 25,
    },
    {
      id: 'assignment-closer',
      name: 'Assignment Closer',
      detail: 'Mark an assignment as done.',
      unlocked: completedCount > 0,
    },
    {
      id: 'deep-work',
      name: 'Deep Work',
      detail: 'Log 60 total focus minutes.',
      unlocked: totalMinutes >= 60,
    },
  ];
}

function buildSmartSuggestions(tasks: Task[], sessions: ReturnType<typeof useTasks>['sessions']): SmartSuggestion[] {
  const recentTaskIds = new Set(sessions.slice(0, 3).map(session => session.taskId).filter(Boolean));
  const workableTasks = tasks.filter(task => task.progress !== 'Done');

  return workableTasks
    .map(task => {
      const days = daysUntil(task.dueDateRaw);
      const untouched = (task.progress ?? 'Not started') === 'Not started';
      const recentlyStudied = recentTaskIds.has(task.id);
      const heavy = task.estimatedHours >= 5;
      const dueSoon = days <= 2;
      const score =
        (dueSoon ? 80 : Math.max(0, 28 - days * 3)) +
        (heavy ? 18 : task.estimatedHours * 2) +
        (untouched ? 12 : 0) +
        (recentlyStudied ? 10 : 0);

      const title = dueSoon
        ? days === 0 ? 'Start this now' : 'Do this next'
        : recentlyStudied
          ? 'Keep the momentum'
          : heavy
            ? 'Break this into a focus round'
            : 'Good quick win';

      const reason = dueSoon
        ? days === 0
          ? 'It is due today, so even a short focus session helps.'
          : `It is due in ${days} day${days === 1 ? '' : 's'} and still needs attention.`
        : recentlyStudied
          ? 'You worked on this recently, so it is easier to continue now.'
          : heavy
            ? `${task.estimatedHours}h estimated. Starting early keeps it from getting stressful.`
            : 'It is manageable and can build momentum.';

      return {
        task,
        title,
        reason,
        action: `Start ${task.hoursPerDay}h focus`,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

function TaskRow({
  task, onPress, onProgress, styles,
}: {
  task: Task;
  onPress: () => void;
  onProgress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const color = urgencyColor(task.estimatedHours);
  const days = daysUntil(task.dueDateRaw);
  const progress = task.progress ?? 'Not started';
  const statusColor = progressColor(progress);

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitles}>
            <Text style={styles.cardAssignment} numberOfLines={1}>{task.assignmentName}</Text>
            <Text style={styles.cardClass}>{task.className}</Text>
          </View>
          <View style={[styles.hourPill, { backgroundColor: color + '20' }]}>
            <Text style={[styles.hourPillText, { color }]}>{task.estimatedHours}h</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDue}>Due {task.dueDate}</Text>
          <Text style={[styles.cardDays, {
            color: days === 0 ? '#EF4444' : days <= 2 ? '#F59E0B' : '#555',
          }]}>
            {days === 0 ? 'Due today!' : days === 1 ? '1 day left' : `${days} days`}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.progressRow}>
        <View style={[styles.progressPill, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.progressPillText, { color: statusColor }]}>{progress}</Text>
        </View>
        <TouchableOpacity style={styles.progressButton} onPress={onProgress}>
          <Text style={styles.progressButtonText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, sessions, updateProgress } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const urgentCount = tasks.filter(t => daysUntil(t.dueDateRaw) <= 2).length;
  const completedCount = tasks.filter(t => t.progress === 'Done').length;
  const recentSessions = sessions.slice(0, 3);
  const smartSuggestions = buildSmartSuggestions(tasks, sessions);
  const streak = getStudyStreak(sessions);
  const badges = buildBadges(sessions, tasks, streak);
  const unlockedBadges = badges.filter(badge => badge.unlocked);
  const nextBadge = badges.find(badge => !badge.unlocked);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        {tasks.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{tasks.length}</Text>
          </View>
        )}
      </View>

      {/* Stats strip */}
      {tasks.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalHours}h</Text>
            <Text style={styles.statLabel}>total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, urgentCount > 0 && styles.statUrgent]}>{urgentCount}</Text>
            <Text style={styles.statLabel}>urgent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>done</Text>
          </View>
        </View>
      )}

      {(sessions.length > 0 || unlockedBadges.length > 0) && (
        <View style={styles.badgePanel}>
          <View style={styles.badgeHeader}>
            <View>
              <Text style={styles.sectionTitle}>Streaks and badges</Text>
              <Text style={styles.suggestionHint}>
                {streak > 0 ? `${streak} day study streak` : 'Finish a session to start a streak'}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakValue}>{streak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
          </View>

          <View style={styles.badgeGrid}>
            {badges.map(badge => (
              <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}>
                <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>{badge.name}</Text>
                <Text style={styles.badgeDetail}>{badge.unlocked ? 'Unlocked' : badge.detail}</Text>
              </View>
            ))}
          </View>

          {!!nextBadge && (
            <View style={styles.nextBadgeCallout}>
              <Text style={styles.nextBadgeTitle}>Next badge</Text>
              <Text style={styles.nextBadgeText}>{nextBadge.name}: {nextBadge.detail}</Text>
            </View>
          )}
        </View>
      )}

      {smartSuggestions.length > 0 && (
        <View style={styles.suggestionPanel}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.sectionTitle}>Smart suggestion</Text>
            <Text style={styles.suggestionHint}>Based on due dates and progress</Text>
          </View>
          {smartSuggestions.map(suggestion => (
            <TouchableOpacity
              key={suggestion.task.id}
              style={styles.suggestionCard}
              onPress={() => router.push(`/focus?id=${suggestion.task.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                <Text style={styles.suggestionTask} numberOfLines={1}>{suggestion.task.assignmentName}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
              </View>
              <View style={styles.suggestionAction}>
                <Text style={styles.suggestionActionText}>{suggestion.action}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {recentSessions.length > 0 && (
        <View style={styles.historyPanel}>
          <Text style={styles.sectionTitle}>Recent focus</Text>
          {recentSessions.map(session => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionText}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{session.assignmentName}</Text>
                <Text style={styles.sessionMeta}>
                  {formatSessionTime(session.focusedSeconds)} focused - {session.coinsEarned} coins
                </Text>
              </View>
              <Text style={styles.sessionPercent}>{session.progressPercent}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No assignments yet</Text>
          <Text style={styles.emptySub}>Hit the + button below to add your first task</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              styles={styles}
              onPress={() => router.push(`/focus?id=${item.id}`)}
              onProgress={() => updateProgress(item.id, nextProgress(item.progress))}
            />
          )}
        />
      )}

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.autoBtn} onPress={() => router.push('/auto-add')}>
          <Text style={styles.autoBtnText}>⚡ Auto-add</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-task')}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  countPill: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 20,
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  countPillText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    marginHorizontal: 24,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statUrgent: {
    color: '#EF4444',
  },
  statLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitles: {
    flex: 1,
    marginRight: 10,
  },
  cardAssignment: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  cardClass: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  hourPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hourPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  cardDue: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  cardDays: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  progressPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  progressButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '800',
  },
  badgePanel: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: 24,
    marginBottom: 18,
    padding: 14,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  streakBadge: {
    minWidth: 58,
    borderRadius: 16,
    backgroundColor: theme.secondary,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  streakValue: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  streakLabel: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.secondary,
    padding: 10,
    minHeight: 78,
  },
  badgeCardLocked: {
    borderColor: theme.border,
    opacity: 0.68,
  },
  badgeName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },
  badgeNameLocked: {
    color: theme.muted,
  },
  badgeDetail: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  nextBadgeCallout: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 11,
    marginTop: 10,
  },
  nextBadgeTitle: {
    color: theme.secondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  nextBadgeText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  suggestionPanel: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: 24,
    marginBottom: 18,
    padding: 14,
  },
  suggestionHeader: {
    marginBottom: 10,
  },
  suggestionHint: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  suggestionCard: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginTop: 8,
  },
  suggestionText: {
    marginBottom: 10,
  },
  suggestionTitle: {
    color: theme.secondary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  suggestionTask: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  suggestionReason: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionAction: {
    alignSelf: 'flex-start',
    backgroundColor: theme.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionActionText: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  historyPanel: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: 24,
    marginBottom: 18,
    padding: 14,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  sessionText: {
    flex: 1,
  },
  sessionTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionMeta: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  sessionPercent: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    color: theme.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  autoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  autoBtnText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
});
