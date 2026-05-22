import { ThemeButton } from '@/components/ui/design-system';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { StudySession, Task, useTasks } from '@/context/TaskContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { type ComponentProps, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

type StudyPlanStep = {
  id: string;
  step: string;
  title: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome5>['name'];
  route: Href;
};

function getNextTask(tasks: Task[]): Task | null {
  return [...tasks]
    .filter(task => task.progress !== 'Done')
    .sort((a, b) => {
      const dayDelta = daysUntil(a.dueDateRaw) - daysUntil(b.dueDateRaw);
      if (dayDelta !== 0) return dayDelta;
      return b.estimatedHours - a.estimatedHours;
    })[0] ?? null;
}

function duePhrase(task: Task): string {
  const days = daysUntil(task.dueDateRaw);
  if (days === 0) return `Due today, ${task.className}`;
  if (days === 1) return `Due tomorrow, ${task.className}`;
  return `Due in ${days} days, ${task.className}`;
}

function buildTodayStudyPlan(openTasks: Task[], sessions: StudySession[]): StudyPlanStep[] {
  const sortedTasks = [...openTasks].sort((a, b) => {
    const dayDelta = daysUntil(a.dueDateRaw) - daysUntil(b.dueDateRaw);
    if (dayDelta !== 0) return dayDelta;
    return b.estimatedHours - a.estimatedHours;
  });
  const firstTask = sortedTasks[0];
  const secondTask = sortedTasks[1];
  const recentRoom = sessions.find(session => !!session.partyRoom)?.partyRoom;

  return [
    firstTask
      ? {
          id: `first-${firstTask.id}`,
          step: 'First',
          title: firstTask.assignmentName,
          detail: `${duePhrase(firstTask)}. ${Math.round(firstTask.hoursPerDay * 60)} min.`,
          icon: 'play',
          route: `/focus?id=${firstTask.id}`,
        }
      : {
          id: 'first-add-assignment',
          step: 'First',
          title: 'Add one assignment',
          detail: 'Start with the next thing due.',
          icon: 'plus',
          route: '/auto-add',
        },
    secondTask
      ? {
          id: `then-${secondTask.id}`,
          step: 'Then',
          title: secondTask.assignmentName,
          detail: duePhrase(secondTask),
          icon: 'clipboard-list',
          route: '/(tabs)/single-player',
        }
      : {
          id: 'then-schedule',
          step: 'Then',
          title: 'Check your schedule',
          detail: 'Fit study time around class.',
          icon: 'calendar-alt',
          route: '/(tabs)/calendar',
        },
    {
      id: recentRoom ? 'later-room-rejoin' : 'later-room-find',
      step: 'Later',
      title: recentRoom ? `Rejoin ${recentRoom}` : 'Find classmates',
      detail: recentRoom ? 'Study with the room again.' : 'Use this when you want company.',
      icon: 'user-friends',
      route: '/(tabs)/multi-player',
    },
  ];
}

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, sessions } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openTasks = tasks.filter(task => task.progress !== 'Done');
  const nextTask = getNextTask(tasks);
  const totalCoins = sessions.reduce((sum, session) => sum + session.coinsEarned, 0);
  const focusedMinutes = Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60);
  const streak = getStudyStreak(sessions);
  const todayStudyPlan = buildTodayStudyPlan(openTasks, sessions);
  const primaryRoute: Href = nextTask ? `/focus?id=${nextTask.id}` : '/auto-add';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity style={styles.schoolPill} onPress={() => router.push('/')} activeOpacity={0.85}>
          <Text style={styles.schoolPillText}>{theme.school ? theme.name : 'Pick school'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nextPanel}>
        <Text style={styles.panelLabel}>Do this now</Text>
        <Text style={styles.nextTitle}>
          {nextTask ? nextTask.assignmentName : 'Add your first assignment'}
        </Text>
        <Text style={styles.nextMeta}>
          {nextTask
            ? `${duePhrase(nextTask)}. Start with ${Math.round(nextTask.hoursPerDay * 60)} minutes.`
            : 'Once one due date is in, your plan becomes clear.'}
        </Text>
        <ThemeButton size="lg" onPress={() => router.push(primaryRoute)}>
          {nextTask ? 'Start focus' : 'Add assignment'}
        </ThemeButton>
      </View>

      <View style={styles.studyPlanSection}>
        <View style={styles.studyPlanHeader}>
          <Text style={styles.sectionTitle}>{"Today's plan"}</Text>
          <Text style={styles.sectionHint}>First, then, later.</Text>
        </View>

        {todayStudyPlan.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.planStep}
            onPress={() => router.push(item.route)}
            activeOpacity={0.85}
          >
            <View style={[styles.planIcon, index === 0 && styles.planIconActive]}>
              <FontAwesome5
                name={item.icon}
                size={10}
                color={index === 0 ? (theme.school ? theme.background : theme.onPrimary) : theme.muted}
              />
            </View>
            <View style={styles.planCopy}>
              <Text style={styles.planStepLabel}>{item.step}</Text>
              <Text style={styles.planStepTitle}>{item.title}</Text>
              <Text style={styles.planStepDetail}>{item.detail}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.quietStats}>
        <Text style={styles.statText}>{streak} day streak</Text>
        <View style={styles.statDot} />
        <Text style={styles.statText}>{totalCoins} coins</Text>
        <View style={styles.statDot} />
        <Text style={styles.statText}>{focusedMinutes} min</Text>
      </View>

      <View style={styles.linkRow}>
        <TouchableOpacity style={styles.textLink} onPress={() => router.push('/(tabs)/single-player')} activeOpacity={0.85}>
          <Text style={styles.textLinkLabel}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textLink} onPress={() => router.push('/(tabs)/calendar')} activeOpacity={0.85}>
          <Text style={styles.textLinkLabel}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textLink} onPress={() => router.push('/(tabs)/multi-player')} activeOpacity={0.85}>
          <Text style={styles.textLinkLabel}>Study groups</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingTop: 38,
    paddingBottom: 124,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
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
  nextPanel: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
  },
  panelLabel: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  nextTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 7,
  },
  nextMeta: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 16,
  },
  studyPlanSection: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 15,
  },
  studyPlanHeader: {
    marginBottom: 11,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  sectionHint: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  planStep: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  planIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  planIconActive: {
    borderColor: theme.school ? theme.secondary : theme.primary,
    backgroundColor: theme.school ? theme.secondary : theme.primary,
  },
  planCopy: {
    flex: 1,
  },
  planStepLabel: {
    color: theme.school ? theme.secondary : theme.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  planStepTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  planStepDetail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  quietStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 18,
  },
  statText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.border,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 20,
  },
  textLink: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
  },
  textLinkLabel: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
