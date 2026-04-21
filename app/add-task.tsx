import { useTasks } from '@/context/TaskContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddTaskScreen() {
  const router = useRouter();
  const { addTask } = useTasks();

  const [assignmentName, setAssignmentName] = useState('');
  const [className, setClassName] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSave = () => {
    if (!assignmentName.trim() || !className.trim() || !dueDate.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields before saving.');
      return;
    }
    addTask({ assignmentName: assignmentName.trim(), className: className.trim(), dueDate: dueDate.trim() });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Manually Insert Assignment</Text>

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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 36,
  },
  label: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
