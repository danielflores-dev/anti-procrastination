import { Task, useTasks } from '@/context/TaskContext';
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

function TaskRow({ task, onPress, styles }: { task: Task; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  const color = urgencyColor(task.estimatedHours);
  const days = daysUntil(task.dueDateRaw);

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.8}>
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
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { tasks } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const urgentCount = tasks.filter(t => daysUntil(t.dueDateRaw) <= 2).length;
  const onTrackCount = tasks.filter(t => daysUntil(t.dueDateRaw) > 5).length;

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
            <Text style={styles.statValue}>{onTrackCount}</Text>
            <Text style={styles.statLabel}>on track</Text>
          </View>
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
            <TaskRow task={item} styles={styles} onPress={() => router.push(`/focus?id=${item.id}`)} />
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
