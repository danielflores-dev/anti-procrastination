import { SUBJECTS } from '@/constants/courseData';
import { ThemeButton, ThemeChip, ThemeField } from '@/components/ui/design-system';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const HOUR_PRESETS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10];

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function defaultDueDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

export default function AddTaskScreen() {
  const router = useRouter();
  const { addTask } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [assignmentName, setAssignmentName] = useState('');
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>(defaultDueDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [errors, setErrors] = useState<{ name?: string; className?: string }>({});

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const selectedSubject = SUBJECTS.find(s => s.id === selectedSubjectId) ?? null;

  const handleSave = (andFocus: boolean) => {
    const nextErrors: { name?: string; className?: string } = {};
    if (!assignmentName.trim()) nextErrors.name = 'Add an assignment name.';
    if (!className.trim()) nextErrors.className = 'Choose or type your class.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const dueDateRaw = dueDate.toISOString();
    const taskId = addTask({
      assignmentName: assignmentName.trim(),
      className: className.trim(),
      description: description.trim(),
      dueDate: formatDateDisplay(dueDate),
      dueDateRaw,
      estimatedHours,
      hoursPerDay: computeHoursPerDay(estimatedHours, dueDateRaw),
    });

    if (andFocus) {
      router.replace(`/focus?id=${taskId}`);
    } else {
      router.back();
    }
  };

  const adjustHours = (delta: number) => {
    setEstimatedHours(h => Math.max(0.5, Math.round((h + delta) * 2) / 2));
  };

  const openPicker = () => {
    setSelectedSubjectId(null);
    setPickerVisible(true);
  };

  const selectCourse = (courseName: string, courseCode: string) => {
    setClassName(`${courseName} (${courseCode})`);
    setErrors(e => ({ ...e, className: undefined }));
    setPickerVisible(false);
    setSelectedSubjectId(null);
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <FontAwesome5 name="chevron-left" size={18} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.heading}>Add assignment</Text>
        </View>

        <Text style={styles.label}>Class</Text>
        <TouchableOpacity
          style={styles.classPickerBtn}
          onPress={openPicker}
          activeOpacity={0.8}
          accessibilityLabel="Browse courses"
          accessibilityRole="button"
        >
          <Text style={className ? styles.classPickerValue : styles.classPickerPlaceholder} numberOfLines={1}>
            {className || 'Browse courses'}
          </Text>
          <FontAwesome5 name="chevron-right" size={13} color={theme.primary} />
        </TouchableOpacity>
        <ThemeField
          inputStyle={styles.classManualInput}
          placeholder="Or type your class"
          value={className}
          onChangeText={text => {
            setClassName(text);
            if (errors.className) setErrors(e => ({ ...e, className: undefined }));
          }}
          error={errors.className}
          accessibilityLabel="Class name"
          containerStyle={styles.classFieldWrap}
        />

        <Text style={styles.label}>Assignment name</Text>
        <ThemeField
          placeholder="Example: Chapter 5 essay"
          value={assignmentName}
          onChangeText={text => {
            setAssignmentName(text);
            if (errors.name) setErrors(e => ({ ...e, name: undefined }));
          }}
          error={errors.name}
          accessibilityLabel="Assignment name"
          containerStyle={styles.fieldWrap}
        />

        <Text style={styles.label}>Due date</Text>
        <TouchableOpacity
          style={styles.dateTrigger}
          onPress={() => setShowDatePicker(v => !v)}
          activeOpacity={0.8}
          accessibilityLabel={`Due date: ${formatDateDisplay(dueDate)}. Tap to change.`}
          accessibilityRole="button"
        >
          <FontAwesome5 name="calendar-alt" size={14} color={theme.primary} />
          <Text style={styles.dateTriggerText}>{formatDateDisplay(dueDate)}</Text>
          <FontAwesome5 name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={11} color={theme.muted} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_, selected) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (selected) setDueDate(selected);
            }}
            style={styles.datePicker}
          />
        )}

        <Text style={[styles.label, styles.labelSpaced]}>
          Description <Text style={styles.optional}>optional</Text>
        </Text>
        <ThemeField
          inputStyle={styles.textArea}
          placeholder="What do you need to do?"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Description"
          containerStyle={styles.fieldWrap}
        />

        <Text style={styles.label}>Estimated time</Text>
        <View style={styles.hoursRow}>
          <TouchableOpacity
            style={styles.adjBtn}
            onPress={() => adjustHours(-0.5)}
            accessibilityLabel="Decrease estimated hours"
            accessibilityRole="button"
          >
            <Text style={styles.adjBtnText}>−</Text>
          </TouchableOpacity>
          <View style={styles.hoursDisplay}>
            <Text style={styles.hoursNumber}>{estimatedHours}h</Text>
            <Text style={styles.hoursSubtext}>estimated</Text>
          </View>
          <TouchableOpacity
            style={styles.adjBtn}
            onPress={() => adjustHours(0.5)}
            accessibilityLabel="Increase estimated hours"
            accessibilityRole="button"
          >
            <Text style={styles.adjBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.presetsRow}>
          {HOUR_PRESETS.map(h => (
            <ThemeChip key={h} selected={estimatedHours === h} onPress={() => setEstimatedHours(h)}>
              {h}h
            </ThemeChip>
          ))}
        </View>

        <ThemeButton size="lg" style={styles.saveButton} onPress={() => handleSave(false)}>
          Save assignment
        </ThemeButton>
        <ThemeButton variant="secondary" style={styles.focusButton} onPress={() => handleSave(true)}>
          Save and start focus
        </ThemeButton>
        <ThemeButton variant="ghost" onPress={() => router.back()}>Cancel</ThemeButton>
      </ScrollView>

      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            {selectedSubject ? (
              <TouchableOpacity
                onPress={() => setSelectedSubjectId(null)}
                style={styles.modalNavBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Back to subjects"
                accessibilityRole="button"
              >
                <FontAwesome5 name="chevron-left" size={16} color={theme.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.modalNavBtn} />
            )}
            <Text style={styles.modalTitle}>
              {selectedSubject ? selectedSubject.label : 'Choose a subject'}
            </Text>
            <TouchableOpacity
              onPress={() => setPickerVisible(false)}
              style={styles.modalNavBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close course picker"
              accessibilityRole="button"
            >
              <FontAwesome5 name="times" size={16} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {!selectedSubject ? (
            <ScrollView contentContainerStyle={styles.subjectGrid}>
              <Text style={styles.pickerHint}>Choose a common course, or type your own class.</Text>
              <View style={styles.subjectCards}>
                {SUBJECTS.map(subject => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.subjectCard}
                    onPress={() => setSelectedSubjectId(subject.id)}
                    activeOpacity={0.75}
                    accessibilityLabel={subject.label}
                    accessibilityRole="button"
                  >
                    <Text style={styles.subjectIcon}>{subject.icon}</Text>
                    <Text style={styles.subjectLabel}>{subject.label}</Text>
                    <Text style={styles.subjectCount}>{subject.courses.length} courses</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.courseList}>
              <Text style={styles.pickerHint}>Tap a course to fill the class field</Text>
              {selectedSubject.courses.map(course => (
                <TouchableOpacity
                  key={course.code}
                  style={styles.courseRow}
                  onPress={() => selectCourse(course.name, course.code)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${course.name}, ${course.code}`}
                  accessibilityRole="button"
                >
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseCode}>{course.code}</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={13} color={theme.muted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.3,
  },

  label: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  labelSpaced: {
    marginTop: 8,
  },
  optional: {
    color: theme.border,
    fontSize: 11,
    textTransform: 'none',
    fontWeight: '400',
    letterSpacing: 0,
  },
  textArea: {
    minHeight: 90,
    lineHeight: 22,
  },
  fieldWrap: {
    marginBottom: 24,
  },

  classPickerBtn: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: theme.border,
    marginBottom: 8,
  },
  classPickerValue: {
    color: theme.text,
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  classPickerPlaceholder: {
    color: theme.primary,
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  classManualInput: {
    fontSize: 14,
    padding: 12,
  },
  classFieldWrap: {
    marginBottom: 24,
  },

  dateTrigger: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  dateTriggerText: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  datePicker: {
    marginBottom: 16,
  },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  adjBtn: {
    backgroundColor: theme.surfaceAlt,
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: { color: theme.text, fontSize: 26, fontWeight: '300' },
  hoursDisplay: { alignItems: 'center' },
  hoursNumber: { color: theme.text, fontSize: 36, fontWeight: 'bold', letterSpacing: -1 },
  hoursSubtext: { color: theme.muted, fontSize: 12, marginTop: 2 },

  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  saveButton: {
    marginBottom: 12,
  },
  focusButton: {
    marginBottom: 12,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalNavBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  pickerHint: {
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },

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
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'flex-start',
    gap: 6,
  },
  subjectIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  subjectLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  subjectCount: {
    color: theme.muted,
    fontSize: 12,
  },

  courseList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  courseCode: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '500',
  },
});
