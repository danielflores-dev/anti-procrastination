import { useTasks } from '@/context/TaskContext';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function hourColor(hours: number): string {
  if (hours < 2) return '#22C55E';
  if (hours < 5) return '#F59E0B';
  return '#EF4444';
}

export default function HomeScreen() {
  const router = useRouter();
  const { tasks } = useTasks();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anti-Procrastination</Text>

      {tasks.length === 0 ? (
        <Text style={styles.empty}>No tasks yet. Add one!</Text>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: hourColor(item.estimatedHours), borderLeftWidth: 4 }]}
              onPress={() => router.push(`/focus?id=${item.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.cardRow}>
                <Text style={styles.assignmentName}>{item.assignmentName}</Text>
                <View style={[styles.hourBadge, { backgroundColor: hourColor(item.estimatedHours) + '33' }]}>
                  <Text style={[styles.hourBadgeText, { color: hourColor(item.estimatedHours) }]}>
                    {item.estimatedHours}h
                  </Text>
                </View>
              </View>
              <Text style={styles.detail}>{item.className}</Text>
              <Text style={styles.detail}>Due: {item.dueDate}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.push('/add-task')}>
        <Text style={styles.buttonText}>Add Task</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.autoButton} onPress={() => router.push('/auto-add')}>
        <Text style={styles.autoButtonText}>Automatically Add Assignments</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121212',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
  },
  empty: {
    color: '#888',
    fontSize: 16,
    marginBottom: 32,
    flex: 1,
  },
  list: {
    width: '100%',
    marginBottom: 24,
    flex: 1,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignmentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  hourBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hourBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    color: '#aaaaaa',
    fontSize: 14,
    marginTop: 2,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  autoButton: {
    backgroundColor: '#1e1e1e',
    borderColor: '#6C63FF',
    borderWidth: 1.5,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  autoButtonText: {
    color: '#6C63FF',
    fontSize: 17,
    fontWeight: '600',
  },
});
