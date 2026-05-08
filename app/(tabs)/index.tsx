import { StudySession, Task, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { ThemeButton } from '@/components/ui/design-system';
import { FontAwesome5 } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { type ComponentProps, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

function daysUntil(raw: string): number {
  return Math.max(0, Math.ceil((new Date(raw).getTime() - Date.now()) / 86400000));
}

function formatSessionTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
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
      detail: 'Finish one focus session.',
      unlocked: sessions.length > 0,
    },
    {
      id: 'three-day-streak',
      name: '3 Day Streak',
      detail: 'Focus three days in a row.',
      unlocked: streak >= 3,
    },
    {
      id: 'group-study',
      name: 'Group Study',
      detail: 'Finish a study room session.',
      unlocked: hasGroupSession,
    },
    {
      id: 'coin-builder',
      name: 'Coin Builder',
      detail: 'Earn 25 coins from focus time.',
      unlocked: totalCoins >= 25,
    },
    {
      id: 'assignment-closer',
      name: 'Assignment Closer',
      detail: 'Finish one assignment.',
      unlocked: completedCount > 0,
    },
    {
      id: 'deep-work',
      name: 'Deep Work',
      detail: 'Reach 60 focus minutes.',
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
        ? days === 0 ? 'Start this today' : 'Do this next'
        : recentlyStudied
          ? 'Keep the momentum'
          : heavy
            ? 'Break this up'
            : 'Good quick win';

      const reason = dueSoon
        ? days === 0
          ? 'It is due today. A short focus session still helps.'
          : `Due in ${days} day${days === 1 ? '' : 's'}, and it still needs time.`
        : recentlyStudied
          ? 'You worked on this recently, so it should be easier to restart.'
          : heavy
            ? `${task.estimatedHours}h estimated. Starting now keeps it from piling up.`
            : 'This is a good quick win.';

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

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, sessions } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const urgentCount = tasks.filter(t => daysUntil(t.dueDateRaw) <= 2).length;
  const completedCount = tasks.filter(t => t.progress === 'Done').length;
  const recentSessions = sessions.slice(0, 3);
  const smartSuggestions = buildSmartSuggestions(tasks, sessions);
  const streak = getStudyStreak(sessions);
  const badges = buildBadges(sessions, tasks, streak);
  const nextBadge = badges.find(badge => !badge.unlocked);
  const loopSteps: {
    id: string;
    label: string;
    title: string;
    detail: string;
    icon: ComponentProps<typeof FontAwesome5>['name'];
    route: Href;
    done: boolean;
  }[] = [
    {
      id: 'school',
      label: 'School',
      title: theme.school ? theme.name : 'Pick school',
      detail: theme.school ? 'Campus colors are on.' : 'Set your campus first.',
      icon: 'university',
      route: '/(tabs)/multi-player',
      done: !!theme.school,
    },
    {
      id: 'work',
      label: 'Work',
      title: tasks.length > 0 ? `${tasks.length} ready` : 'Add work',
      detail: tasks.length > 0 ? 'Your queue is ready.' : 'Add one assignment.',
      icon: 'clipboard-list',
      route: tasks.length > 0 ? '/(tabs)/single-player' : '/auto-add',
      done: tasks.length > 0,
    },
    {
      id: 'focus',
      label: 'Focus',
      title: totalHours > 0 ? `${totalHours}h planned` : 'Start focus',
      detail: tasks.length > 0 ? 'Pick a task and begin.' : 'Focus unlocks after work is added.',
      icon: 'play',
      route: '/(tabs)/single-player',
      done: sessions.length > 0,
    },
    {
      id: 'people',
      label: 'People',
      title: 'Join people',
      detail: 'Find classmates or a room.',
      icon: 'user-friends',
      route: '/(tabs)/multi-player',
      done: sessions.some(session => !!session.partyRoom),
    },
    {
      id: 'rewards',
      label: 'Rewards',
      title: streak > 0 ? `${streak} day streak` : 'Earn coins',
      detail: sessions.length > 0 ? 'Spend coins and keep going.' : 'Rewards come from focus.',
      icon: 'coins',
      route: '/(tabs)/shop',
      done: sessions.length > 0,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.dashboardContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        {tasks.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{tasks.length}</Text>
          </View>
        )}
      </View>

      <View style={styles.coreLoop}>
        <View style={styles.loopHeader}>
          <View>
            <Text style={styles.kicker}>Study loop</Text>
            <Text style={styles.loopTitle}>Know what to tap next</Text>
          </View>
          <Text style={styles.loopHint}>5 steps</Text>
        </View>
        <View style={styles.loopSteps}>
          {loopSteps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[styles.loopStep, step.done && styles.loopStepDone]}
              onPress={() => router.push(step.route)}
              activeOpacity={0.85}
              accessibilityLabel={`${step.label}: ${step.title}`}
            >
              <View style={[styles.loopIcon, step.done && styles.loopIconDone]}>
                <FontAwesome5 name={step.done ? 'check' : step.icon} size={13} color={step.done ? '#22C55E' : (theme.school ? theme.background : theme.onPrimary)} />
              </View>
              <View style={styles.loopCopy}>
                <Text style={styles.loopLabel}>{index + 1}. {step.label}</Text>
                <Text style={styles.loopStepTitle}>{step.title}</Text>
                <Text style={styles.loopDetail}>{step.detail}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={11} color={theme.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats strip */}
      {tasks.length > 0 && (
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
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>done</Text>
          </View>
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

      {tasks.length > 0 && (
          <View style={styles.homeActions}>
            <ThemeButton size="lg" onPress={() => router.push('/(tabs)/single-player')}>
            {tasks.length > 0 ? 'Open work' : 'Add work'}
            </ThemeButton>
            <ThemeButton size="lg" onPress={() => router.push('/(tabs)/multi-player')}>
            Join people
            </ThemeButton>
          </View>
      )}

      <View style={styles.badgePanel}>
        <View style={styles.badgeHeader}>
          <View>
            <Text style={styles.sectionTitle}>Streaks and badges</Text>
            <Text style={styles.suggestionHint}>
              {streak > 0 ? `${streak} day focus streak` : 'Finish a session to start a streak'}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakLabel}>days</Text>
          </View>
        </View>

        <View style={styles.badgeTrail}>
          {badges.map((badge, index) => (
            <View key={badge.id} style={styles.badgeTrailItem}>
              <View style={[styles.badgeDot, badge.unlocked && styles.badgeDotUnlocked]}>
                {badge.unlocked ? (
                  <FontAwesome5 name="check" size={12} color={theme.school ? theme.background : theme.onPrimary} />
                ) : (
                  <Text style={styles.badgeDotText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.badgeTrailText}>
                <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>{badge.name}</Text>
                <Text style={styles.badgeDetail}>{badge.unlocked ? 'Unlocked' : badge.detail}</Text>
              </View>
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

      {recentSessions.length > 0 && (
        <View style={styles.historyPanel}>
          <Text style={styles.sectionTitle}>Recent focus</Text>
          {recentSessions.map(session => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionText}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{session.assignmentName}</Text>
                <Text style={styles.sessionMeta}>
                  {formatSessionTime(session.focusedSeconds)} focused, {session.coinsEarned} coins
                </Text>
              </View>
              <Text style={styles.sessionPercent}>{session.progressPercent}%</Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 36,
  },
  dashboardContent: {
    paddingBottom: 124,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  kicker: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
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
  coreLoop: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
  },
  loopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  loopTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  loopHint: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  loopSteps: {
    gap: 9,
  },
  loopStep: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loopStepDone: {
    backgroundColor: theme.surfaceAlt,
  },
  loopIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.school ? theme.secondary : theme.primary,
  },
  loopIconDone: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  loopCopy: {
    flex: 1,
  },
  loopLabel: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  loopStepTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  loopDetail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
    letterSpacing: 0.35,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border,
  },
  onboardingPanel: {
    marginHorizontal: 20,
    marginBottom: 28,
    paddingTop: 4,
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  onboardingTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
  },
  onboardingSub: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  skipButton: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  onboardingSteps: {
    gap: 0,
    marginBottom: 18,
  },
  onboardingStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 13,
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.school ? theme.secondary : theme.primary,
  },
  onboardingStepText: {
    flex: 1,
  },
  onboardingStepTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  onboardingStepDetail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  onboardingPrimary: {
    flex: 1,
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: theme.school ? theme.secondary : theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingPrimaryText: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  onboardingSecondary: {
    flex: 1,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  onboardingSecondaryText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  breakdownBox: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 12,
    padding: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownCount: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
  },
  stepCheck: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },
  stepCheckDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  stepCheckText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  stepTextDone: {
    color: theme.muted,
    textDecorationLine: 'line-through',
  },
  planBox: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 10,
    padding: 12,
    gap: 8,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  planDate: {
    width: 66,
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  planTextWrap: {
    flex: 1,
  },
  planFocus: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  planMinutes: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  badgePanel: {
    marginHorizontal: 20,
    marginBottom: 26,
    paddingTop: 2,
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
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  streakValue: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  streakLabel: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  badgeTrail: { borderTopWidth: 1, borderTopColor: theme.border },
  badgeTrailItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 12 },
  badgeDot: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border },
  badgeDotUnlocked: { backgroundColor: theme.school ? theme.secondary : theme.primary, borderColor: theme.school ? theme.secondary : theme.primary },
  badgeDotText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  badgeTrailText: { flex: 1 },
  badgeName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
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
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
    marginTop: 12,
  },
  nextBadgeTitle: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  nextBadgeText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  suggestionPanel: {
    marginHorizontal: 20,
    marginBottom: 26,
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
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
  },
  suggestionText: {
    marginBottom: 10,
  },
  suggestionTitle: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  suggestionTask: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  suggestionReason: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionAction: {
    alignSelf: 'flex-start',
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    shadowColor: theme.school ? theme.secondary : theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionActionText: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  historyPanel: {
    marginHorizontal: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  homeActions: {
    gap: 10,
    marginHorizontal: 20,
    marginTop: 2,
  },
  primaryHomeAction: {
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: theme.school ? theme.secondary : theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryHomeActionText: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryHomeAction: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryHomeActionText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
});
