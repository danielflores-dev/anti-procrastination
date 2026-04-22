import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const HOUR_PRESETS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10];

export default function AddTaskScreen() {
  const router = useRouter();
  const { addTask } = useTasks();

  const [assignmentName, setAssignmentName] = useState('');
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(1);

  const handleSave = () => {
    if (!assignmentName.trim() || !className.trim() || !dueDate.trim()) {
      Alert.alert('Missing fields', 'Please fill in assignment name, class, and due date.');
      return;
    }
    const parsed = new Date(dueDate.trim());
    const dueDateRaw = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    addTask({
      assignmentName: assignmentName.trim(),
      className: className.trim(),
      description: description.trim(),
      dueDate: dueDate.trim(),
      dueDateRaw,
      estimatedHours,
      hoursPerDay: computeHoursPerDay(estimatedHours, dueDateRaw),
    });
    router.replace('/(tabs)/calendar');
  };

  const adjustHours = (delta: number) => {
    setEstimatedHours(h => Math.max(0.5, Math.round((h + delta) * 2) / 2));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Add Assignment</Text>

      <Text style={styles.label}>Assignment Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Essay on Chapter 5"
        placeholderTextColor="#555"
        value={assignmentName}
        onChangeText={setAssignmentName}
      />

      <Text style={styles.label}>Class Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. English 101"
        placeholderTextColor="#555"
        value={className}
        onChangeText={setClassName}
      />

      <Text style={styles.label}>Due Date</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. April 25, 2026"
        placeholderTextColor="#555"
        value={dueDate}
        onChangeText={setDueDate}
      />

      <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What does this assignment involve?"
        placeholderTextColor="#555"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Estimated Time to Complete</Text>
      <View style={styles.hoursRow}>
        <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHours(-0.5)}>
          <Text style={styles.adjBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.hoursDisplay}>
          <Text style={styles.hoursNumber}>{estimatedHours}h</Text>
          <Text style={styles.hoursSubtext}>estimated</Text>
        </View>
        <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHours(0.5)}>
          <Text style={styles.adjBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.presetsRow}>
        {HOUR_PRESETS.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.preset, estimatedHours === h && styles.presetActive]}
            onPress={() => setEstimatedHours(h)}
          >
            <Text style={[styles.presetText, estimatedHours === h && styles.presetTextActive]}>
              {h}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Assignment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#121212' },
  container: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 60 },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
  },
  label: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optional: {
    color: '#555',
    fontSize: 11,
    textTransform: 'none',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  textArea: {
    minHeight: 100,
    lineHeight: 22,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  adjBtn: {
    backgroundColor: '#2e2e2e',
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: { color: '#ffffff', fontSize: 26, fontWeight: '300' },
  hoursDisplay: { alignItems: 'center' },
  hoursNumber: { color: '#ffffff', fontSize: 36, fontWeight: 'bold' },
  hoursSubtext: { color: '#555', fontSize: 12, marginTop: 2 },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  preset: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  presetActive: {
    backgroundColor: '#6C63FF22',
    borderColor: '#6C63FF',
  },
  presetText: { color: '#666', fontSize: 13, fontWeight: '600' },
  presetTextActive: { color: '#6C63FF' },
  saveButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { color: '#888', fontSize: 16 },
});
