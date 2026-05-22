import { ThemeButton } from '@/components/ui/design-system';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { StudySession, Task, useTasks } from '@/context/TaskContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { type ComponentProps, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
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

function sessionDateKey(dateRaw: string): string {
  const date = new Date(dateRaw);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

type Badge = {
  id: string;
  name: string;
  detail: string;
  unlocked: boolean;
};

type ActionItem = {
  id: string;
  label: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome5>['name'];
  onPress: () => void;
};

type ReminderItem = {
  id: string;
  label: string;
  detail: string;
  sample: string;
};

function buildBadges(sessions: StudySession[], tasks: Task[], streak: number): Badge[] {
  const totalCoins = sessions.reduce((sum, session) => sum + session.coinsEarned, 0);
  const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60);
  const hasGroupSession = sessions.some(session => !!session.partyRoom);
  const completedCount = tasks.filter(task => task.progress === 'Done').length;

  return [
    { id: 'first-focus', name: 'First Focus', detail: 'Finish one focus session.', unlocked: sessions.length > 0 },
    { id: 'three-day-streak', name: '3 Day Streak', detail: 'Focus three days in a row.', unlocked: streak >= 3 },
    { id: 'group-study', name: 'Group Study', detail: 'Finish a study room session.', unlocked: hasGroupSession },
    { id: 'coin-builder', name: 'Coin Builder', detail: 'Earn 25 coins from focus time.', unlocked: totalCoins >= 25 },
    { id: 'assignment-closer', name: 'Assignment Closer', detail: 'Finish one assignment.', unlocked: completedCount > 0 },
    { id: 'deep-work', name: 'Deep Work', detail: 'Reach 60 focus minutes.', unlocked: totalMinutes >= 60 },
  ];
}

function getNextTask(tasks: Task[]): Task | null {
  return [...tasks]
    .filter(task => task.progress !== 'Done')
    .sort((a, b) => {
      const dayDelta = daysUntil(a.dueDateRaw) - daysUntil(b.dueDateRaw);
      if (dayDelta !== 0) return dayDelta;
      return b.estimatedHours - a.estimatedHours;
    })[0] ?? null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, sessions } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [gentleRemindersOn, setGentleRemindersOn] = useState(true);

  const nextTask = getNextTask(tasks);
  const openTasks = tasks.filter(task => task.progress !== 'Done');
  const urgentCount = openTasks.filter(task => daysUntil(task.dueDateRaw) <= 2).length;
  const recentSessions = sessions.slice(0, 2);
  const totalCoins = sessions.reduce((sum, session) => sum + session.coinsEarned, 0);
  const focusedMinutes = Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60);
  const streak = getStudyStreak(sessions);
  const nextBadge = buildBadges(sessions, tasks, streak).find(badge => !badge.unlocked);
  const primaryAction = nextTask ? 'Start focus' : 'Add assignment';
  const primaryRoute: Href = nextTask ? `/focus?id=${nextTask.id}` : '/auto-add';
  const reminderItems: ReminderItem[] = [
    {
      id: 'assignment',
      label: 'Planned work',
      detail: 'A calm heads-up before a focus block.',
      sample: nextTask
        ? `You planned ${nextTask.className} for later today.`
        : 'Want to add one assignment for this week?',
    },
    {
      id: 'small-start',
      label: 'Small start',
      detail: 'Suggests a short session when the day is busy.',
      sample: nextTask
        ? `Want to do 25 minutes of ${nextTask.assignmentName} before dinner?`
        : 'Want to do 25 minutes before dinner?',
    },
    {
      id: 'group',
      label: 'Study group',
      detail: 'Reminds you before a shared room starts.',
      sample: 'Your study group starts soon.',
    },
  ];
  const activeReminder = nextTask ? reminderItems[1] : reminderItems[0];

  const actions: ActionItem[] = [
    {
      id: 'work',
      label: nextTask ? 'Open assignments' : 'Add work',
      detail: nextTask ? `${openTasks.length} active` : 'Start your queue',
      icon: 'clipboard-list',
      onPress: () => router.push(nextTask ? '/(tabs)/single-player' : '/auto-add'),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      detail: urgentCount > 0 ? `${urgentCount} urgent` : 'Classes and events',
      icon: 'calendar-alt',
      onPress: () => router.push('/(tabs)/calendar'),
    },
    {
      id: 'group',
      label: 'Study group',
      detail: 'Find classmates',
      icon: 'user-friends',
      onPress: () => router.push('/(tabs)/multi-player'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        <View style={styles.schoolPill}>
          <Text style={styles.schoolPillText}>{theme.school ? theme.name : 'Pick school'}</Text>
        </View>
      </View>

      <View style={styles.todayPanel}>
        <View style={styles.todayTop}>
          <View style={styles.todayCopy}>
            <Text style={styles.panelLabel}>Next up</Text>
            <Text style={styles.todayTitle}>
              {nextTask ? nextTask.assignmentName : 'Add one assignment'}
            </Text>
            <Text style={styles.todayMeta}>
              {nextTask
                ? `${nextTask.className} • due ${nextTask.dueDate} • ${nextTask.hoursPerDay}h focus`
                : 'Build your queue, then the app will help you start focus.'}
            </Text>
          </View>
          <View style={styles.focusBadge}>
            <Text style={styles.focusBadgeValue}>{nextTask ? `${daysUntil(nextTask.dueDateRaw)}d` : '1'}</Text>
            <Text style={styles.focusBadgeLabel}>{nextTask ? 'left' : 'step'}</Text>
          </View>
        </View>

        <ThemeButton size="lg" onPress={() => router.push(primaryRoute)}>
          {primaryAction}
        </ThemeButton>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{streak}</Text>
          <Text style={styles.metricLabel}>day streak</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{totalCoins}</Text>
          <Text style={styles.metricLabel}>coins</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{focusedMinutes}</Text>
          <Text style={styles.metricLabel}>minutes</Text>
        </View>
      </View>

      <View style={styles.reminderSection}>
        <View style={styles.reminderTop}>
          <View style={styles.reminderIcon}>
            <FontAwesome5 name="bell" size={13} color={theme.school ? theme.background : theme.onPrimary} />
          </View>
          <View style={styles.reminderCopy}>
            <Text style={styles.sectionTitle}>Gentle reminders</Text>
            <Text style={styles.sectionHint}>Student-friendly nudges, not noisy alerts.</Text>
          </View>
          <Switch
            value={gentleRemindersOn}
            onValueChange={setGentleRemindersOn}
            trackColor={{ false: theme.surfaceAlt, true: theme.school ? theme.secondary : theme.primary }}
            thumbColor={theme.text}
            ios_backgroundColor={theme.surfaceAlt}
          />
        </View>

        <TouchableOpacity
          style={[styles.reminderPreview, !gentleRemindersOn && styles.reminderPreviewOff]}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Gentle reminder', activeReminder.sample)}
        >
          <Text style={styles.reminderPreviewLabel}>Preview</Text>
          <Text style={styles.reminderPreviewText}>{activeReminder.sample}</Text>
        </TouchableOpacity>

        <View style={styles.reminderList}>
          {reminderItems.map(item => (
            <View key={item.id} style={styles.reminderItem}>
              <Text style={styles.reminderItemTitle}>{item.label}</Text>
              <Text style={styles.reminderItemDetail}>{item.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.quickActions}>
        {actions.map(action => (
          <TouchableOpacity key={action.id} style={styles.quickAction} onPress={action.onPress} activeOpacity={0.85}>
            <View style={styles.quickIcon}>
              <FontAwesome5 name={action.icon} size={13} color={theme.school ? theme.background : theme.onPrimary} />
            </View>
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>{action.label}</Text>
              <Text style={styles.quickDetail}>{action.detail}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Progress</Text>
            <Text style={styles.sectionHint}>
              {nextBadge ? `Next badge: ${nextBadge.name}` : 'All current badges unlocked'}
            </Text>
          </View>
          <TouchableOpacity style={styles.rewardButton} onPress={() => router.push('/(tabs)/shop')} activeOpacity={0.85}>
            <Text style={styles.rewardButtonText}>Rewards</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressLine}>
          <View style={[styles.progressFill, { width: sessions.length > 0 ? '62%' : '18%' }]} />
        </View>
        <Text style={styles.progressText}>
          {sessions.length > 0
            ? 'Keep one calm focus session going each study day.'
            : 'Finish your first focus session to start your streak.'}
        </Text>
      </View>

      {recentSessions.length > 0 && (
        <View style={styles.recentSection}>
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
  },
  content: {
    paddingTop: 36,
    paddingBottom: 124,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 22,
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
    color: theme.text,
    fontSize: 26,
    fontWeight: '700',
  },
  date: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  schoolPill: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 11,
  },
  schoolPillText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  todayPanel: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
  },
  todayTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  todayCopy: {
    flex: 1,
  },
  panelLabel: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  todayTitle: {
    color: theme.text,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
    marginBottom: 6,
  },
  todayMeta: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  focusBadge: {
    minWidth: 54,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: theme.school ? theme.secondary : theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusBadgeValue: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  focusBadgeLabel: {
    color: theme.school ? theme.background : theme.onPrimary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    backgroundColor: theme.border,
  },
  quickActions: {
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  quickAction: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.school ? theme.secondary : theme.primary,
  },
  quickText: {
    flex: 1,
  },
  quickTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickDetail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  reminderSection: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 14,
  },
  reminderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.school ? theme.secondary : theme.primary,
  },
  reminderCopy: {
    flex: 1,
  },
  reminderPreview: {
    borderRadius: 16,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 12,
  },
  reminderPreviewOff: {
    opacity: 0.72,
  },
  reminderPreviewLabel: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  reminderPreviewText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  reminderList: {
    gap: 9,
  },
  reminderItem: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 9,
  },
  reminderItemTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  reminderItemDetail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  progressSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  rewardButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 13,
  },
  rewardButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  progressLine: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: theme.surfaceAlt,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.school ? theme.secondary : theme.primary,
  },
  progressText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  recentSection: {
    marginHorizontal: 20,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 10,
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
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
