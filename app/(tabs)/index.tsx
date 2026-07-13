import { GOLD, PIXEL_FONT, PixelBadge, PixelButton, PixelHeading, PixelPanel, PixelProgress } from '@/components/pixel-ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ArcadeTabScreen from '@/components/ArcadeTabScreen';
import PixelBackdrop from '@/components/PixelBackdrop';
import PixelCity from '@/components/PixelCity';
import PixelConfettiBurst from '@/components/PixelConfetti';
import { PixelSkyStrip } from '@/components/PixelWorld';
import { useCoins } from '@/context/CoinContext';
import { usePowerUps } from '@/context/PowerUpContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { getStudyStreak, sessionDateKey, StudySession, Task, useTasks } from '@/context/TaskContext';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Href, useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CLAIMED_KEY = 'antiprocrastination.claimed-achievements.v1';
const DAILY_KEY = 'antiprocrastination.daily-claims.v1';
const COLLAPSED_KEY = 'antiprocrastination.home-collapsed.v1';

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

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
  const { tasks, sessions, city } = useTasks();
  const { coins, addCoins } = useCoins();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTopInfo, setActiveTopInfo] = useState<TopStatInfo | null>(null);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [claimedHydrated, setClaimedHydrated] = useState(false);
  const [claimCelebration, setClaimCelebration] = useState<number | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState<string[]>([]);
  const [dailyHydrated, setDailyHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [collapsedHydrated, setCollapsedHydrated] = useState(false);

  const todayKey = sessionDateKey(new Date().toISOString());

  useEffect(() => {
    AsyncStorage.getItem(COLLAPSED_KEY)
      .then(saved => {
        if (saved) setCollapsed(JSON.parse(saved));
      })
      .catch(() => {})
      .finally(() => setCollapsedHydrated(true));
  }, []);

  useEffect(() => {
    if (!collapsedHydrated) return;
    AsyncStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed)).catch(() => {});
  }, [collapsed, collapsedHydrated]);

  const toggleSection = (key: string) => {
    setCollapsed(current => current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]);
  };

  useEffect(() => {
    AsyncStorage.getItem(CLAIMED_KEY)
      .then(saved => {
        if (saved) setClaimedIds(JSON.parse(saved));
      })
      .catch(() => {})
      .finally(() => setClaimedHydrated(true));
  }, []);

  useEffect(() => {
    if (!claimedHydrated) return;
    AsyncStorage.setItem(CLAIMED_KEY, JSON.stringify(claimedIds)).catch(() => {});
  }, [claimedIds, claimedHydrated]);

  // Daily quest claims only count for the day they were made.
  useEffect(() => {
    AsyncStorage.getItem(DAILY_KEY)
      .then(saved => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (parsed.date === todayKey && Array.isArray(parsed.claimed)) {
          setDailyClaimed(parsed.claimed);
        }
      })
      .catch(() => {})
      .finally(() => setDailyHydrated(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dailyHydrated) return;
    AsyncStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey, claimed: dailyClaimed })).catch(() => {});
  }, [dailyClaimed, dailyHydrated, todayKey]);

  const handleClaimDaily = (id: string, reward: number) => {
    if (dailyClaimed.includes(id)) return;
    setDailyClaimed(current => [...current, id]);
    addCoins(reward);
    if (!reducedMotion) setClaimCelebration(reward);
  };

  const reducedMotion = useReducedMotion();

  const handleClaim = (id: string, reward: number) => {
    if (claimedIds.includes(id)) return;
    setClaimedIds(current => [...current, id]);
    addCoins(reward);
    if (!reducedMotion) setClaimCelebration(reward);
  };

  const { shields, bridgedDates, useShieldFor } = usePowerUps();

  // A streak shield automatically covers yesterday if it would break the chain.
  useEffect(() => {
    if (shields <= 0) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    const yesterdayKey = sessionDateKey(yesterday.toISOString());
    const dayBeforeKey = sessionDateKey(dayBefore.toISOString());
    const studied = new Set(sessions.map(session => sessionDateKey(session.createdAt)));
    bridgedDates.forEach(date => studied.add(date));
    if (!studied.has(yesterdayKey) && studied.has(dayBeforeKey)) {
      useShieldFor(yesterdayKey);
    }
  }, [shields, sessions, bridgedDates, useShieldFor]);

  const openTasks = tasks.filter(task => task.progress !== 'Done');
  const nextTask = getNextTask(tasks);
  const focusedMinutes = Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60);
  const streak = getStudyStreak(sessions, bridgedDates);
  const todayStudyPlan = buildTodayStudyPlan(openTasks, sessions);
  const primaryRoute: Href = nextTask ? `/focus?id=${nextTask.id}` : '/auto-add';
  const finishedCount = city.length;
  const sessionCount = sessions.length;
  const earlyBird = sessions.some(s => new Date(s.createdAt).getHours() < 9 && s.focusedSeconds >= 300);
  const studiedInGroup = sessions.some(s => !!s.partyRoom || s.coinMultiplier > 1);
  const finishedEarly = city.some(building => {
    const source = tasks.find(t => t.id === building.id);
    if (!source) return false;
    return new Date(source.dueDateRaw).getTime() - new Date(building.finishedAt).getTime() >= 2 * 86400000;
  });

  type Achievement = {
    id: string;
    title: string;
    reward: number;
    progress: number;
    current: string;
    icon: ComponentProps<typeof FontAwesome5>['name'];
  };

  const achievements: Achievement[] = [
    {
      id: 'focus-30',
      title: 'Study for 30 min',
      reward: 20,
      progress: Math.min(1, focusedMinutes / 30),
      current: `${Math.min(focusedMinutes, 30)}/30 min`,
      icon: 'clock',
    },
    {
      id: 'focus-60',
      title: 'Study for 1 hour',
      reward: 45,
      progress: Math.min(1, focusedMinutes / 60),
      current: `${Math.min(focusedMinutes, 60)}/60 min`,
      icon: 'hourglass-half',
    },
    {
      id: 'focus-300',
      title: 'Study for 5 hours total',
      reward: 120,
      progress: Math.min(1, focusedMinutes / 300),
      current: `${Math.min(focusedMinutes, 300)}/300 min`,
      icon: 'graduation-cap',
    },
    {
      id: 'sessions-10',
      title: 'Finish 10 focus sessions',
      reward: 90,
      progress: Math.min(1, sessionCount / 10),
      current: `${Math.min(sessionCount, 10)}/10 sessions`,
      icon: 'redo',
    },
    {
      id: 'streak-3',
      title: 'Keep a 3 day streak',
      reward: 60,
      progress: Math.min(1, streak / 3),
      current: `${Math.min(streak, 3)}/3 days`,
      icon: 'fire',
    },
    {
      id: 'streak-7',
      title: 'Keep a 7 day streak',
      reward: 150,
      progress: Math.min(1, streak / 7),
      current: `${Math.min(streak, 7)}/7 days`,
      icon: 'fire-alt',
    },
    {
      id: 'finish-1',
      title: 'Raise your first building',
      reward: 25,
      progress: Math.min(1, finishedCount / 1),
      current: `${Math.min(finishedCount, 1)}/1 finished`,
      icon: 'building',
    },
    {
      id: 'finish-5',
      title: 'Grow your city to 5 buildings',
      reward: 75,
      progress: Math.min(1, finishedCount / 5),
      current: `${Math.min(finishedCount, 5)}/5 finished`,
      icon: 'city',
    },
    {
      id: 'finish-10',
      title: 'Grow your city to 10 buildings',
      reward: 200,
      progress: Math.min(1, finishedCount / 10),
      current: `${Math.min(finishedCount, 10)}/10 finished`,
      icon: 'archway',
    },
    {
      id: 'early-bird',
      title: 'Study before 9 AM',
      reward: 40,
      progress: earlyBird ? 1 : 0,
      current: earlyBird ? 'Done' : 'Not yet',
      icon: 'sun',
    },
    {
      id: 'early-finish',
      title: 'Finish something 2+ days early',
      reward: 80,
      progress: finishedEarly ? 1 : 0,
      current: finishedEarly ? 'Done' : 'Not yet',
      icon: 'flag-checkered',
    },
    {
      id: 'group-study',
      title: 'Study in a group session',
      reward: 50,
      progress: studiedInGroup ? 1 : 0,
      current: studiedInGroup ? 'Done' : 'Not yet',
      icon: 'user-friends',
    },
    {
      id: 'flawless-1',
      title: 'Finish a flawless session',
      reward: 60,
      progress: sessions.some(s => s.flawless) ? 1 : 0,
      current: sessions.some(s => s.flawless) ? 'Done' : '10+ min without leaving',
      icon: 'gem',
    },
  ];

  // Claimable first, then in-progress, claimed sink to the bottom.
  const achievementRank = (a: Achievement) => {
    const claimed = claimedIds.includes(a.id);
    if (claimed) return 2;
    return a.progress >= 1 ? 0 : 1;
  };
  const sortedAchievements = [...achievements].sort((a, b) => achievementRank(a) - achievementRank(b));

  // ---- Daily quests: three goals drawn from today's date, reset at midnight.
  const todaySessions = sessions.filter(s => sessionDateKey(s.createdAt) === todayKey);
  const minutesToday = Math.round(todaySessions.reduce((sum, s) => sum + s.focusedSeconds, 0) / 60);
  const coinsToday = todaySessions.reduce((sum, s) => sum + s.coinsEarned, 0);
  const beforeNoon = todaySessions.some(s => new Date(s.createdAt).getHours() < 12);
  const longSessionToday = todaySessions.some(s => s.focusedSeconds >= 1500);
  const finishedToday = city.filter(b => sessionDateKey(b.finishedAt) === todayKey).length;
  const hardestTask = [...openTasks].sort((a, b) => b.estimatedHours - a.estimatedHours)[0];
  const workedHardest = !!hardestTask && todaySessions.some(s => s.taskId === hardestTask.id);

  const questPool: Achievement[] = [
    {
      id: 'daily-20min',
      title: 'Study 20 minutes today',
      reward: 15,
      progress: Math.min(1, minutesToday / 20),
      current: `${Math.min(minutesToday, 20)}/20 min`,
      icon: 'stopwatch',
    },
    {
      id: 'daily-45min',
      title: 'Study 45 minutes today',
      reward: 25,
      progress: Math.min(1, minutesToday / 45),
      current: `${Math.min(minutesToday, 45)}/45 min`,
      icon: 'stopwatch-20',
    },
    {
      id: 'daily-2sessions',
      title: 'Finish 2 focus sessions',
      reward: 20,
      progress: Math.min(1, todaySessions.length / 2),
      current: `${Math.min(todaySessions.length, 2)}/2 sessions`,
      icon: 'redo',
    },
    {
      id: 'daily-noon',
      title: 'Save a session before noon',
      reward: 20,
      progress: beforeNoon ? 1 : 0,
      current: beforeNoon ? 'Done' : 'Not yet',
      icon: 'sun',
    },
    {
      id: 'daily-30coins',
      title: 'Earn 30 coins from focus',
      reward: 15,
      progress: Math.min(1, coinsToday / 30),
      current: `${Math.min(coinsToday, 30)}/30 coins`,
      icon: 'coins',
    },
    {
      id: 'daily-long',
      title: 'One 25+ minute session',
      reward: 20,
      progress: longSessionToday ? 1 : 0,
      current: longSessionToday ? 'Done' : 'Not yet',
      icon: 'hourglass-half',
    },
    {
      id: 'daily-finish',
      title: 'Finish an assignment today',
      reward: 30,
      progress: Math.min(1, finishedToday / 1),
      current: `${Math.min(finishedToday, 1)}/1 finished`,
      icon: 'flag-checkered',
    },
    ...(hardestTask ? [{
      id: 'daily-hardest',
      title: 'Work on your hardest assignment',
      reward: 25,
      progress: workedHardest ? 1 : 0,
      current: workedHardest ? 'Done' : hardestTask.assignmentName,
      icon: 'mountain' as ComponentProps<typeof FontAwesome5>['name'],
    }] : []),
  ];

  const questRand = seededRandom(Number(todayKey.replace(/-/g, '')));
  const dailyQuests = [...questPool]
    .map(quest => ({ quest, order: questRand() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(entry => entry.quest);

  const dailyReady = dailyQuests.filter(q => q.progress >= 1 && !dailyClaimed.includes(q.id)).length;
  const achievementsReady = achievements.filter(a => a.progress >= 1 && !claimedIds.includes(a.id)).length;

  const renderSectionHeader = (key: string, title: string, hint: string, readyCount = 0) => {
    const isCollapsed = collapsed.includes(key);
    return (
      <TouchableOpacity
        style={[styles.sectionHeading, isCollapsed && styles.sectionHeadingCollapsed]}
        onPress={() => toggleSection(key)}
        activeOpacity={0.75}
        accessibilityLabel={`${isCollapsed ? 'Show' : 'Hide'} ${title}`}
        accessibilityRole="button"
      >
        <View style={styles.sectionHeaderRow}>
          <PixelHeading hint={isCollapsed ? undefined : hint}>{title}</PixelHeading>
          <View style={styles.sectionHeaderRight}>
            {readyCount > 0 && (
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>{readyCount} ready</Text>
              </View>
            )}
            <FontAwesome5 name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={11} color={theme.muted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };
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
    <ArcadeTabScreen index={0} style={styles.container}>
      <PixelBackdrop />
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
      {/* Time-of-day sky header */}
      <PixelSkyStrip height={190}>
        <View style={styles.skyContent}>
          <View style={styles.skyTopRow}>
            <Text style={styles.kicker}>Today</Text>
            <PixelBadge
              onPress={() => router.push({ pathname: '/(tabs)/multi-player', params: { start: 'school', t: String(Date.now()) } })}
              accessibilityLabel={theme.school ? `School: ${theme.name}. Tap to change your school.` : 'Pick your school'}
              icon={<FontAwesome5 name="exchange-alt" size={10} color={theme.primary} />}
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
          {coins}
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

      {renderSectionHeader('path', 'Study path', 'Tap the next step.')}

      {!collapsed.includes('path') && (
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
      )}

      {renderSectionHeader('city', 'Your city', 'One building per finished assignment.')}
      {!collapsed.includes('city') && (
        <PixelPanel tone="alt" padding={0} style={styles.cityPanel}>
          <PixelCity buildings={city} />
        </PixelPanel>
      )}

      {renderSectionHeader('daily', 'Daily quests', 'Three fresh goals every day.', dailyReady)}
      {!collapsed.includes('daily') && (
      <View style={styles.questRow}>
        {dailyQuests.map(item => {
          const complete = item.progress >= 1;
          const claimed = dailyClaimed.includes(item.id);
          const claimable = complete && !claimed;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.questTile, claimable && styles.questTileReady]}
              disabled={!claimable}
              onPress={() => handleClaimDaily(item.id, item.reward)}
              activeOpacity={0.8}
              accessibilityLabel={claimable
                ? `Claim ${item.reward} coins for ${item.title}`
                : `${item.title}: ${claimed ? 'claimed' : item.current}`}
              accessibilityRole="button"
            >
              <View style={[
                styles.questIcon,
                claimable && { backgroundColor: GOLD },
                claimed && { backgroundColor: theme.primary },
              ]}>
                <FontAwesome5
                  name={complete ? 'check' : item.icon}
                  size={13}
                  color={claimable ? '#1C1917' : claimed ? theme.onPrimary : theme.primary}
                />
              </View>
              <Text style={styles.questTitle} numberOfLines={2}>{item.title}</Text>
              <PixelProgress progress={item.progress} height={6} blocks={8} color={claimed ? '#22C55E' : undefined} />
              <Text style={[styles.questMeta, claimable && styles.questMetaReady]} numberOfLines={1}>
                {claimed ? 'Claimed' : claimable ? `Tap · +${item.reward}` : item.current}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      )}

      {renderSectionHeader('achievements', 'Achievements', 'Small goals for extra coins.', achievementsReady)}
      {!collapsed.includes('achievements') && (
      <View style={styles.achievementList}>
        {sortedAchievements.map(item => {
          const complete = item.progress >= 1;
          const claimed = claimedIds.includes(item.id);
          const claimable = complete && !claimed;
          return (
            <PixelPanel key={item.id}>
              <View style={styles.achievementRow}>
                <View style={[
                  styles.achievementIcon,
                  claimable && { backgroundColor: GOLD },
                  claimed && { backgroundColor: theme.primary },
                ]}>
                  <FontAwesome5
                    name={complete ? 'check' : item.icon}
                    size={14}
                    color={claimable ? '#1C1917' : claimed ? theme.onPrimary : theme.primary}
                  />
                </View>
                <View style={styles.achievementCopy}>
                  <View style={styles.achievementTopLine}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    {!claimable && <Text style={styles.achievementReward}>+{item.reward}</Text>}
                  </View>
                  <PixelProgress progress={item.progress} height={8} color={claimed ? '#22C55E' : undefined} />
                  <Text style={styles.achievementProgress}>
                    {claimed ? 'Claimed' : complete ? 'Ready to claim' : item.current}
                  </Text>
                </View>
                {claimable && (
                  <PixelButton
                    size="sm"
                    onPress={() => handleClaim(item.id, item.reward)}
                    accessibilityLabel={`Claim ${item.reward} coins for ${item.title}`}
                  >
                    {`+${item.reward}`}
                  </PixelButton>
                )}
              </View>
            </PixelPanel>
          );
        })}
      </View>
      )}
      </ScrollView>

      {claimCelebration !== null && (
        <PixelConfettiBurst
          message={`+${claimCelebration} coins!`}
          durationMs={1300}
          onDone={() => setClaimCelebration(null)}
        />
      )}
    </ArcadeTabScreen>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollArea: {
    flex: 1,
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
    marginBottom: 28,
  },
  statPanel: {
    marginHorizontal: 20,
    marginTop: -12,
    marginBottom: 28,
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
  sectionHeadingCollapsed: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  readyBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  readyBadgeText: {
    color: '#1C1917',
    fontSize: 9,
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
  },
  path: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  pathRow: {
    minHeight: 172,
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
  cityPanel: {
    marginHorizontal: 20,
    marginBottom: 40,
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
  questRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  questTile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  questTileReady: {
    borderTopColor: GOLD,
    borderLeftColor: GOLD,
    borderBottomColor: GOLD,
    borderRightColor: GOLD,
  },
  questIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
  },
  questTitle: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 15,
    minHeight: 30,
  },
  questMeta: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: PIXEL_FONT,
  },
  questMetaReady: {
    color: GOLD,
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
