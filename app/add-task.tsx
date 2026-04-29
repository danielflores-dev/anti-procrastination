import { SUBJECTS } from '@/constants/courseData';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
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
  const { theme } = useSchoolTheme();

  const [assignmentName, setAssignmentName] = useState('');
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [focused, setFocused] = useState<string | null>(null);

  // Course picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const selectedSubject = SUBJECTS.find(s => s.id === selectedSubjectId) ?? null;

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

  const inputStyle = (field: string) => [
    styles.input,
    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
    focused === field && styles.inputFocused,
    focused === field && { borderColor: theme.primary },
  ];

  const openPicker = () => {
    setSelectedSubjectId(null);
    setPickerVisible(true);
  };

  const selectCourse = (courseName: string, courseCode: string) => {
    setClassName(`${courseName} (${courseCode})`);
    setPickerVisible(false);
    setSelectedSubjectId(null);
  };

  return (
    <>
      <ScrollView style={[styles.scroll, { backgroundColor: theme.background }]} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>New Assignment</Text>
        </View>

        <Text style={styles.label}>Class</Text>
        {/* Tap to browse or type manually */}
        <TouchableOpacity style={styles.classPickerBtn} onPress={openPicker} activeOpacity={0.8}>
          <Text style={className ? styles.classPickerValue : styles.classPickerPlaceholder} numberOfLines={1}>
            {className || 'Browse courses…'}
          </Text>
          <Text style={styles.classPickerChevron}>›</Text>
        </TouchableOpacity>
        <TextInput
          style={[inputStyle('className'), styles.classManualInput]}
          placeholder="Or type manually"
          placeholderTextColor="#333"
          value={className}
          onChangeText={setClassName}
          onFocus={() => setFocused('className')}
          onBlur={() => setFocused(null)}
        />

        <Text style={styles.label}>Assignment Name</Text>
        <TextInput
          style={inputStyle('assignmentName')}
          placeholder="e.g. Essay on Chapter 5"
          placeholderTextColor="#444"
          value={assignmentName}
          onChangeText={setAssignmentName}
          onFocus={() => setFocused('assignmentName')}
          onBlur={() => setFocused(null)}
        />

        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={inputStyle('dueDate')}
          placeholder="e.g. May 10, 2026"
          placeholderTextColor="#444"
          value={dueDate}
          onChangeText={setDueDate}
          onFocus={() => setFocused('dueDate')}
          onBlur={() => setFocused(null)}
        />

        <Text style={styles.label}>
          Description <Text style={styles.optional}>optional</Text>
        </Text>
        <TextInput
          style={[inputStyle('description'), styles.textArea]}
          placeholder="What does this assignment involve?"
          placeholderTextColor="#444"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          onFocus={() => setFocused('description')}
          onBlur={() => setFocused(null)}
        />

        <Text style={styles.label}>Estimated Time</Text>
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

      {/* Course Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            {selectedSubject ? (
              <TouchableOpacity onPress={() => setSelectedSubjectId(null)} style={styles.modalBackBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalBackArrow}>‹</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.modalBackBtn} />
            )}
            <Text style={styles.modalTitle}>
              {selectedSubject ? selectedSubject.label : 'Choose a Subject'}
            </Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {!selectedSubject ? (
            // Subject grid
            <ScrollView contentContainerStyle={styles.subjectGrid}>
              <Text style={styles.pickerHint}>Based on UC & CSU course catalogs</Text>
              <View style={styles.subjectCards}>
                {SUBJECTS.map(subject => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.subjectCard}
                    onPress={() => setSelectedSubjectId(subject.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.subjectIcon}>{subject.icon}</Text>
                    <Text style={styles.subjectLabel}>{subject.label}</Text>
                    <Text style={styles.subjectCount}>{subject.courses.length} courses</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            // Course list for selected subject
            <ScrollView contentContainerStyle={styles.courseList}>
              <Text style={styles.pickerHint}>Tap a course to auto-fill</Text>
              {selectedSubject.courses.map(course => (
                <TouchableOpacity
                  key={course.code}
                  style={styles.courseRow}
                  onPress={() => selectCourse(course.name, course.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseCode}>{course.code}</Text>
                  </View>
                  <Text style={styles.courseChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0f0f0f' },
  container: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backBtn: { marginRight: 10 },
  backArrow: {
    color: '#6C63FF',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  label: {
    color: '#777',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optional: {
    color: '#444',
    fontSize: 11,
    textTransform: 'none',
    fontWeight: '400',
    letterSpacing: 0,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#252525',
  },
  inputFocused: {
    borderColor: '#6C63FF',
    backgroundColor: '#1e1a2e',
  },
  textArea: {
    minHeight: 90,
    lineHeight: 22,
  },

  // Class picker
  classPickerBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#6C63FF55',
    marginBottom: 8,
  },
  classPickerValue: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  classPickerPlaceholder: {
    color: '#6C63FF',
    fontSize: 16,
    flex: 1,
  },
  classPickerChevron: {
    color: '#6C63FF',
    fontSize: 22,
    marginLeft: 8,
  },
  classManualInput: {
    marginBottom: 24,
    fontSize: 14,
    padding: 12,
    color: '#aaa',
  },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252525',
  },
  adjBtn: {
    backgroundColor: '#252525',
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: { color: '#ffffff', fontSize: 26, fontWeight: '300' },
  hoursDisplay: { alignItems: 'center' },
  hoursNumber: { color: '#ffffff', fontSize: 36, fontWeight: 'bold', letterSpacing: -1 },
  hoursSubtext: { color: '#555', fontSize: 12, marginTop: 2 },

  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  preset: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#252525',
  },
  presetActive: {
    backgroundColor: '#6C63FF22',
    borderColor: '#6C63FF',
  },
  presetText: { color: '#555', fontSize: 13, fontWeight: '600' },
  presetTextActive: { color: '#6C63FF' },

  saveButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { color: '#555', fontSize: 16 },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  modalBackBtn: {
    width: 32,
  },
  modalBackArrow: {
    color: '#6C63FF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalClose: {
    color: '#555',
    fontSize: 18,
    width: 32,
    textAlign: 'right',
  },

  pickerHint: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },

  // Subject grid
  subjectGrid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subjectCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  subjectCard: {
    width: '47%',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252525',
    alignItems: 'flex-start',
    gap: 6,
  },
  subjectIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  subjectLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  subjectCount: {
    color: '#555',
    fontSize: 12,
  },

  // Course list
  courseList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#252525',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  courseCode: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '500',
  },
  courseChevron: {
    color: '#444',
    fontSize: 22,
    marginLeft: 8,
  },
});
