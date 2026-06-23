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
          color: '#F59E0B',
          title: 'Streak',
          text: 'Days in a row you finish a focus session. Study once today to keep it going.',
        },
        coins: {
          icon: 'coins' as ComponentProps<typeof FontAwesome5>['name'],
          color: '#D9A441',
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
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.statCapsule, styles.streakCapsule]}
          onPress={() => setActiveTopInfo(current => (current === 'streak' ? null : 'streak'))}
          activeOpacity={0.85}
          accessibilityLabel="Show streak details"
        >
          <FontAwesome5 name="fire" size={12} color="#F59E0B" />
          <Text style={styles.statCapsuleText}>{streak}</Text>
        </TouchableOpacity>
        <View style={styles.topStatsRight}>
          <TouchableOpacity
            style={styles.statCapsule}
            onPress={() => setActiveTopInfo(current => (current === 'coins' ? null : 'coins'))}
            activeOpacity={0.85}
            accessibilityLabel="Show coin details"
          >
            <FontAwesome5 name="coins" size={12} color="#D9A441" />
            <Text style={styles.statCapsuleText}>{totalCoins}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCapsule}
            onPress={() => setActiveTopInfo(current => (current === 'time' ? null : 'time'))}
            activeOpacity={0.85}
            accessibilityLabel="Show focus time details"
          >
            <FontAwesome5 name="clock" size={12} color={theme.primary} />
            <Text style={styles.statCapsuleText}>{focusedMinutes}m</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTopDetail && (
        <View
          style={[
            styles.statPopover,
            activeTopInfo === 'streak' ? styles.statPopoverLeft : styles.statPopoverRight,
          ]}
        >
          <View
            style={[
              styles.statPopoverArrow,
              activeTopInfo === 'streak'
                ? styles.statPopoverArrowLeft
                : activeTopInfo === 'coins'
                  ? styles.statPopoverArrowCoins
                  : styles.statPopoverArrowTime,
            ]}
          />
          <View style={styles.streakInfoHeader}>
            <FontAwesome5 name={activeTopDetail.icon} size={13} color={activeTopDetail.color} />
            <Text style={styles.streakInfoTitle}>{activeTopDetail.title}</Text>
            <TouchableOpacity
              style={styles.streakCloseButton}
              onPress={() => setActiveTopInfo(null)}
              activeOpacity={0.8}
              accessibilityLabel="Close stat details"
            >
              <FontAwesome5 name="times" size={11} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.streakInfoText}>{activeTopDetail.text}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity
          style={styles.schoolPill}
          onPress={() => router.push({ pathname: '/(tabs)/multi-player', params: { start: 'school' } })}
          activeOpacity={0.85}
          accessibilityLabel={theme.school ? `School: ${theme.name}. Tap to switch.` : 'Pick your school'}
          accessibilityRole="button"
        >
          <Text style={styles.schoolPillText}>{theme.school ? theme.name : 'Pick school'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pathHeader}>
        <Text style={styles.sectionTitle}>Study path</Text>
        <Text style={styles.sectionHint}>Tap the next step.</Text>
      </View>

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
                <View style={[styles.pathNode, isActive && styles.pathNodeActive]}>
                  <FontAwesome5
                    name={item.icon}
                    size={isActive ? 24 : 18}
                    color={isActive ? theme.onPrimary : theme.primary}
                  />
                </View>
                <View style={[styles.nodeLabel, isActive && styles.nodeLabelActive]}>
                  <Text style={[styles.nodeTitle, isActive && styles.nodeTitleActive]} numberOfLines={2}>
                    {index === 0 && !nextTask ? 'Add assignment' : item.title}
                  </Text>
                  <Text style={[styles.nodeDetail, isActive && styles.nodeDetailActive]} numberOfLines={2}>
                    {item.detail}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.achievementSection}>
        <View style={styles.achievementHeader}>
          <View>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.sectionHint}>Small goals for extra coins.</Text>
          </View>
          <View style={styles.rewardBadge}>
            <FontAwesome5 name="coins" size={12} color="#D9A441" />
            <Text style={styles.rewardBadgeText}>Rewards</Text>
          </View>
        </View>

        <View style={styles.achievementList}>
          {achievements.map(item => {
            const complete = item.progress >= 1;
            return (
              <View key={item.id} style={styles.achievementRow}>
                <View style={[styles.achievementIcon, complete && styles.achievementIconComplete]}>
                  <FontAwesome5 name={complete ? 'check' : item.icon} size={14} color={complete ? theme.onPrimary : theme.primary} />
                </View>
                <View style={styles.achievementCopy}>
                  <View style={styles.achievementTopLine}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementReward}>+{item.reward}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.achievementProgress}>{complete ? 'Ready to claim' : item.current}</Text>
                </View>
              </View>
            );
          })}
        </View>
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
    paddingTop: 24,
    paddingBottom: 118,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  topStatsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statCapsule: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
  },
  streakCapsule: {
    borderColor: '#7A4E1D',
  },
  statCapsuleText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statPopover: {
    position: 'absolute',
    top: 62,
    zIndex: 20,
    width: 270,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7A4E1D',
    backgroundColor: theme.surface,
    paddingHorizontal: 13,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  statPopoverLeft: {
    left: 20,
  },
  statPopoverRight: {
    right: 20,
  },
  statPopoverArrow: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#7A4E1D',
    backgroundColor: theme.surface,
    transform: [{ rotate: '45deg' }],
  },
  statPopoverArrowLeft: {
    left: 21,
  },
  statPopoverArrowCoins: {
    right: 82,
  },
  statPopoverArrowTime: {
    right: 24,
  },
  streakInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  streakInfoTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  streakCloseButton: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
  },
  streakInfoText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  kicker: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.35,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  greeting: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '600',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 11,
  },
  schoolPillText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pathHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3,
  },
  sectionHint: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: 2,
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
  pathNode: {
    width: 82,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  pathNodeActive: {
    width: 106,
    height: 90,
    borderRadius: 32,
    borderColor: theme.primary,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  nodeLabel: {
    minWidth: 230,
    maxWidth: 300,
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  nodeLabelActive: {
    borderColor: theme.primary,
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
  nodeDetailActive: {
    color: theme.text,
  },
  achievementSection: {
    marginHorizontal: 20,
    marginTop: 6,
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingTop: 18,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  rewardBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
  },
  rewardBadgeText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  achievementList: {
    gap: 10,
  },
  achievementRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 12,
  },
  achievementIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  achievementIconComplete: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
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
    color: '#D9A441',
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.surfaceAlt,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  achievementProgress: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
