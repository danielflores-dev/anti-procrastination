import { GOLD, PIXEL_FONT, PixelBadge, PixelHeading, PixelPanel, PixelProgress } from '@/components/pixel-ui';
import { PixelSkyStrip } from '@/components/PixelWorld';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { StudySession, Task, useTasks } from '@/context/TaskContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { type ComponentProps, useMemo, useState } from 'react';
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
  title: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome5>['name'];
  route: Href;
};

type TopStatInfo = 'streak' | 'coins' | 'time';

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
          title: firstTask.assignmentName,
          detail: `${duePhrase(firstTask)}. ${Math.round(firstTask.hoursPerDay * 60)} min.`,
          icon: 'play',
          route: `/focus?id=${firstTask.id}`,
        }
      : {
          id: 'first-add-assignment',
          title: 'Add work',
          detail: 'Add what is due next.',
          icon: 'plus',
          route: '/auto-add',
        },
    secondTask
      ? {
          id: `then-${secondTask.id}`,
          title: secondTask.assignmentName,
          detail: duePhrase(secondTask),
          icon: 'clipboard-list',
          route: '/(tabs)/single-player',
        }
      : {
          id: 'then-schedule',
          title: 'Check schedule',
          detail: 'Make room for study time.',
          icon: 'calendar-alt',
          route: '/(tabs)/calendar',
        },
    {
      id: recentRoom ? 'later-room-rejoin' : 'later-room-find',
      title: recentRoom ? `Rejoin ${recentRoom}` : 'Find a room',
      detail: recentRoom ? 'Return when you are ready.' : 'Find people when it helps.',
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
  const [activeTopInfo, setActiveTopInfo] = useState<TopStatInfo | null>(null);

  const openTasks = tasks.filter(task => task.progress !== 'Done');
  const nextTask = getNextTask(tasks);
  const totalCoins = sessions.reduce((sum, session) => sum + session.coinsEarned, 0);
  const focusedMinutes = Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60);
  const streak = getStudyStreak(sessions);
  const todayStudyPlan = buildTodayStudyPlan(openTasks, sessions);
  const primaryRoute: Href = nextTask ? `/focus?id=${nextTask.id}` : '/auto-add';
  const achievements = [
    {
      id: 'focus-30',
      title: 'Study for 30 min',
      reward: 20,
      progress: Math.min(1, focusedMinutes / 30),
      current: `${Math.min(focusedMinutes, 30)}/30 min`,
      icon: 'clock' as ComponentProps<typeof FontAwesome5>['name'],
    },
    {
      id: 'focus-60',
      title: 'Study for 1 hour',
      reward: 45,
      progress: Math.min(1, focusedMinutes / 60),
      current: `${Math.min(focusedMinutes, 60)}/60 min`,
      icon: 'hourglass-half' as ComponentProps<typeof FontAwesome5>['name'],
    },
    {
      id: 'streak-3',
      title: 'Keep a 3 day streak',
      reward: 60,
      progress: Math.min(1, streak / 3),
      current: `${Math.min(streak, 3)}/3 days`,
      icon: 'fire' as ComponentProps<typeof FontAwesome5>['name'],
    },
  ];
  const activeTopDetail = activeTopInfo
    ? {
        streak: {
          icon: 'fire' as ComponentProps<typeof FontAwesome5>['name'],
          color: GOLD,
          title: 'Streak',
          text: 'Days in a row you finish a focus session. Study once today to keep it going.',
        },
        coins: {
          icon: 'coins' as ComponentProps<typeof FontAwesome5>['name'],
          color: GOLD,
          title: 'Coins',
          text: 'Coins are rewards you earn after focus sessions, achievements, and group study.',
        },
        time: {
          icon: 'clock' as ComponentProps<typeof FontAwesome5>['name'],
          color: theme.primary,
          title: 'Focus time',
          text: 'This shows how many minutes you have spent in focus sessions.',
        },
      }[activeTopInfo]
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Time-of-day sky header */}
      <PixelSkyStrip height={190}>
        <View style={styles.skyContent}>
          <View style={styles.skyTopRow}>
            <Text style={styles.kicker}>Today</Text>
            <PixelBadge
              onPress={() => router.push({ pathname: '/(tabs)/multi-player', params: { start: 'school' } })}
              accessibilityLabel={theme.school ? `School: ${theme.name}. Tap to switch.` : 'Pick your school'}
            >
              {theme.school ? theme.name : 'Pick school'}
            </PixelBadge>
          </View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
      </PixelSkyStrip>

      {/* HUD stat counters */}
      <View style={styles.hudRow}>
        <PixelBadge
          onPress={() => setActiveTopInfo(current => (current === 'streak' ? null : 'streak'))}
          accessibilityLabel="Show streak details"
          icon={<FontAwesome5 name="fire" size={12} color={GOLD} />}
        >
          {streak}
        </PixelBadge>
        <PixelBadge
          onPress={() => setActiveTopInfo(current => (current === 'coins' ? null : 'coins'))}
          accessibilityLabel="Show coin details"
          icon={<FontAwesome5 name="coins" size={12} color={GOLD} />}
        >
          {totalCoins}
        </PixelBadge>
        <PixelBadge
          onPress={() => setActiveTopInfo(current => (current === 'time' ? null : 'time'))}
          accessibilityLabel="Show focus time details"
          icon={<FontAwesome5 name="clock" size={12} color={theme.primary} />}
        >
          {`${focusedMinutes}m`}
        </PixelBadge>
      </View>

      {activeTopDetail && (
        <PixelPanel style={styles.statPanel}>
          <View style={styles.statPanelHeader}>
            <FontAwesome5 name={activeTopDetail.icon} size={13} color={activeTopDetail.color} />
            <Text style={styles.statPanelTitle}>{activeTopDetail.title}</Text>
            <TouchableOpacity
              style={styles.statPanelClose}
              onPress={() => setActiveTopInfo(null)}
              activeOpacity={0.8}
              accessibilityLabel="Close stat details"
            >
              <FontAwesome5 name="times" size={11} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.statPanelText}>{activeTopDetail.text}</Text>
        </PixelPanel>
      )}

      <PixelHeading hint="Tap the next step." style={styles.sectionHeading}>
        {"Study path"}
      </PixelHeading>

      <View style={styles.path}>
        {todayStudyPlan.map((item, index) => {
          const isActive = index === 0;
          const alignStyle = index % 2 === 0 ? styles.pathNodeLeft : styles.pathNodeRight;
          return (
            <View key={item.id} style={styles.pathRow}>
              {index < todayStudyPlan.length - 1 && <View style={styles.pathLine} />}
              <TouchableOpacity
                style={[styles.pathNodeWrap, alignStyle]}
                onPress={() => router.push(index === 0 ? primaryRoute : item.route)}
                activeOpacity={0.88}
                accessibilityLabel={index === 0 && !nextTask ? 'Add assignment' : item.title}
                accessibilityRole="button"
              >
                <View style={styles.nodeRim}>
                  <View style={[styles.pathNode, isActive && styles.pathNodeActive]}>
                    <FontAwesome5
                      name={item.icon}
                      size={isActive ? 24 : 18}
                      color={isActive ? theme.onPrimary : theme.primary}
                    />
                  </View>
                </View>
                <View style={[styles.nodeRim, styles.nodeLabelRim]}>
                  <View style={[styles.nodeLabel, isActive && styles.nodeLabelActive]}>
                    <Text style={[styles.nodeTitle, isActive && styles.nodeTitleActive]} numberOfLines={2}>
                      {index === 0 && !nextTask ? 'Add assignment' : item.title}
                    </Text>
                    <Text style={styles.nodeDetail} numberOfLines={2}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.achievementHeader}>
        <PixelHeading hint="Small goals for extra coins.">Achievements</PixelHeading>
        <PixelBadge icon={<FontAwesome5 name="coins" size={12} color={GOLD} />}>Rewards</PixelBadge>
      </View>

      <View style={styles.achievementList}>
        {achievements.map(item => {
          const complete = item.progress >= 1;
          return (
            <PixelPanel key={item.id}>
              <View style={styles.achievementRow}>
                <View style={[styles.achievementIcon, complete && { backgroundColor: theme.primary }]}>
                  <FontAwesome5
                    name={complete ? 'check' : item.icon}
                    size={14}
                    color={complete ? theme.onPrimary : theme.primary}
                  />
                </View>
                <View style={styles.achievementCopy}>
                  <View style={styles.achievementTopLine}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementReward}>+{item.reward}</Text>
                  </View>
                  <PixelProgress progress={item.progress} height={8} />
                  <Text style={styles.achievementProgress}>
                    {complete ? 'Ready to claim' : item.current}
                  </Text>
                </View>
              </View>
            </PixelPanel>
          );
        })}
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
    paddingBottom: 118,
  },
  skyContent: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 20,
  },
  skyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kicker: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  greeting: {
    color: '#F8FAFC',
    fontSize: 26,
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
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  hudRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: -18,
    marginBottom: 16,
  },
  statPanel: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  statPanelTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statPanelClose: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPanelText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionHeading: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  path: {
    paddingHorizontal: 20,
  },
  pathRow: {
    minHeight: 190,
    position: 'relative',
  },
  pathLine: {
    position: 'absolute',
    top: 88,
    bottom: -18,
    left: '50%',
    width: 4,
    marginLeft: -2,
    backgroundColor: theme.border,
  },
  pathNodeWrap: {
    width: '82%',
    alignItems: 'center',
  },
  pathNodeLeft: {
    alignSelf: 'flex-start',
  },
  pathNodeRight: {
    alignSelf: 'flex-end',
  },
  nodeRim: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    borderRadius: 4,
  },
  nodeLabelRim: {
    marginTop: 12,
  },
  pathNode: {
    width: 82,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
  },
  pathNodeActive: {
    width: 106,
    height: 90,
    backgroundColor: theme.primary,
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderLeftColor: 'rgba(255,255,255,0.3)',
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRightColor: 'rgba(0,0,0,0.3)',
  },
  nodeLabel: {
    minWidth: 230,
    maxWidth: 300,
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  nodeLabelActive: {
    backgroundColor: theme.surfaceAlt,
  },
  nodeTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  nodeTitleActive: {
    fontSize: 18,
    lineHeight: 22,
  },
  nodeDetail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  achievementList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderLeftColor: 'rgba(255,255,255,0.12)',
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRightColor: 'rgba(0,0,0,0.3)',
  },
  achievementCopy: {
    flex: 1,
  },
  achievementTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  achievementTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  achievementReward: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  achievementProgress: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
