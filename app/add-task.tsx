import { SUBJECTS } from '@/constants/courseData';
import { PIXEL_FONT, PixelButton, PixelField } from '@/components/pixel-ui';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, useRef } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tasks, addTask, updateTask } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const editingTask = id ? tasks.find(t => t.id === id) ?? null : null;

  const [assignmentName, setAssignmentName] = useState(editingTask?.assignmentName ?? '');
  const [className, setClassName] = useState(editingTask?.className ?? '');
  const [dueDate, setDueDate] = useState<Date>(() =>
    editingTask ? new Date(editingTask.dueDateRaw) : defaultDueDate()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState(editingTask?.estimatedHours ?? 1);
  const [isExam, setIsExam] = useState(editingTask?.isExam ?? false);
  const [errors, setErrors] = useState<{ name?: string; className?: string }>({});
  const dateInputRef = useRef<any>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const selectedSubject = SUBJECTS.find(s => s.id === selectedSubjectId) ?? null;

  const handleSave = (andFocus: boolean) => {
    const nextErrors: { name?: string; className?: string } = {};
    if (!assignmentName.trim()) nextErrors.name = 'What is the assignment called?';
    if (!className.trim()) nextErrors.className = 'Which class is this for?';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const dueDateRaw = dueDate.toISOString();

    if (editingTask) {
      updateTask(editingTask.id, {
        assignmentName: assignmentName.trim(),
        className: className.trim(),
        dueDate: formatDateDisplay(dueDate),
        dueDateRaw,
        estimatedHours,
        isExam,
      });
      if (andFocus) {
        router.replace(`/focus?id=${editingTask.id}`);
      } else {
        router.back();
      }
      return;
    }

    const taskId = addTask({
      assignmentName: assignmentName.trim(),
      className: className.trim(),
      description: '',
      dueDate: formatDateDisplay(dueDate),
      dueDateRaw,
      estimatedHours,
      hoursPerDay: computeHoursPerDay(estimatedHours, dueDateRaw),
      isExam,
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <FontAwesome5 name="chevron-left" size={18} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.heading}>{editingTask ? 'Edit assignment' : 'New assignment'}</Text>
        </View>

        {/* Assignment name */}
        <View style={styles.fieldBlock}>
          <Text style={styles.question}>What are you working on?</Text>
          <PixelField
            placeholder="e.g. Chapter 5 essay"
            value={assignmentName}
            onChangeText={text => {
              setAssignmentName(text);
              if (errors.name) setErrors(e => ({ ...e, name: undefined }));
            }}
            error={errors.name}
            accessibilityLabel="Assignment name"
            containerStyle={styles.fieldWrap}
          />
        </View>

        {/* Class */}
        <View style={styles.fieldBlock}>
          <View style={styles.questionRow}>
            <Text style={styles.question}>Which class?</Text>
            <TouchableOpacity
              onPress={() => { setSelectedSubjectId(null); setPickerVisible(true); }}
              accessibilityLabel="Browse course list"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.browseLink}>Browse</Text>
            </TouchableOpacity>
          </View>
          <PixelField
            placeholder="e.g. Biology 101"
            value={className}
            onChangeText={text => {
              setClassName(text);
              if (errors.className) setErrors(e => ({ ...e, className: undefined }));
            }}
            error={errors.className}
            accessibilityLabel="Class name"
            containerStyle={styles.fieldWrap}
          />
        </View>

        {/* Due date */}
        <View style={styles.fieldBlock}>
          <Text style={styles.question}>When is it due?</Text>
          <TouchableOpacity
            style={styles.dateTrigger}
            onPress={() => {
              if (Platform.OS === 'web') {
                if (dateInputRef.current?.showPicker) {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current?.click();
                }
              } else {
                setShowDatePicker(v => !v);
              }
            }}
            activeOpacity={0.8}
            accessibilityLabel={`Due date: ${formatDateDisplay(dueDate)}. Tap to change.`}
            accessibilityRole="button"
          >
            <FontAwesome5 name="calendar-alt" size={15} color={theme.primary} />
            <Text style={styles.dateTriggerText}>{formatDateDisplay(dueDate)}</Text>
            <FontAwesome5 name="chevron-down" size={11} color={theme.muted} />
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <input
              ref={dateInputRef}
              type="date"
              value={dueDate.toISOString().split('T')[0]}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e: any) => {
                if (e.target.value) {
                  const d = new Date(e.target.value + 'T12:00:00');
                  if (!isNaN(d.getTime())) setDueDate(d);
                }
              }}
              style={{ position: 'fixed', top: 0, left: 0, opacity: 0, width: 1, height: 1, pointerEvents: 'none', colorScheme: 'dark' } as any}
            />
          )}
          {Platform.OS !== 'web' && showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selected) setDueDate(selected);
              }}
              style={styles.datePicker}
            />
          )}
        </View>

        {/* Estimated time */}
        <View style={styles.fieldBlock}>
          <Text style={styles.question}>How long will it take?</Text>
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
              <Text style={styles.hoursSubtext}>your best guess is fine</Text>
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
        </View>

        {/* Exam boss toggle */}
        <TouchableOpacity
          style={styles.examRow}
          onPress={() => setIsExam(v => !v)}
          activeOpacity={0.8}
          accessibilityLabel={`Exam prep: ${isExam ? 'on' : 'off'}`}
          accessibilityRole="switch"
        >
          <View style={[styles.examCheck, isExam && styles.examCheckOn]}>
            {isExam && <FontAwesome5 name="skull" size={12} color="#FEE2E2" />}
          </View>
          <View style={styles.examCopy}>
            <Text style={styles.examTitle}>This is an exam</Text>
            <Text style={styles.examSub}>Focus sessions become a boss battle.</Text>
          </View>
        </TouchableOpacity>

        <PixelButton size="lg" style={styles.saveButton} onPress={() => handleSave(false)}>
          {editingTask ? 'Save changes' : 'Save assignment'}
        </PixelButton>
        <PixelButton variant="ghost" style={styles.focusButton} onPress={() => handleSave(true)}>
          Save and start focus now
        </PixelButton>
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
              <Text style={styles.pickerHint}>Pick a subject, then choose your course.</Text>
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
              <Text style={styles.pickerHint}>Tap a course to select it</Text>
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
  container: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 80 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    color: theme.text,
    letterSpacing: 0.5,
  },

  fieldBlock: {
    marginBottom: 36,
  },
  question: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  browseLink: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldWrap: {
    marginBottom: 0,
  },

  dateTrigger: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    position: 'relative',
    overflow: 'hidden',
  },
  dateTriggerText: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  datePicker: {
    marginTop: 8,
  },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 2,
    padding: 12,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
  },
  adjBtn: {
    backgroundColor: theme.surfaceAlt,
    width: 56,
    height: 56,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
  },
  adjBtnText: { color: theme.text, fontSize: 28, fontWeight: '400', fontFamily: PIXEL_FONT },
  hoursDisplay: { alignItems: 'center', gap: 4 },
  hoursNumber: { color: theme.text, fontSize: 38, fontWeight: '800', fontFamily: PIXEL_FONT, letterSpacing: -1 },
  hoursSubtext: { color: theme.muted, fontSize: 12, fontWeight: '600' },

  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    padding: 14,
    marginBottom: 24,
  },
  examCheck: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
  },
  examCheckOn: {
    backgroundColor: '#B91C1C',
  },
  examCopy: { flex: 1 },
  examTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  examSub: { color: theme.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  saveButton: { marginBottom: 14 },
  focusButton: { marginBottom: 8 },

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
    fontSize: 16,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
  },
  pickerHint: {
    color: theme.muted,
    fontSize: 13,
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
    borderRadius: 2,
    padding: 16,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    alignItems: 'flex-start',
    gap: 6,
  },
  subjectIcon: { fontSize: 28, marginBottom: 4 },
  subjectLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
  subjectCount: { color: theme.muted, fontSize: 12 },

  courseList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 2,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
  },
  courseInfo: { flex: 1 },
  courseName: { color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  courseCode: { color: theme.primary, fontSize: 12, fontWeight: '600' },
});
