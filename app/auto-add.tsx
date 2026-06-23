import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { ThemeButton, ThemeCard } from '@/components/ui/design-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Step = 'pick' | 'analyzing' | 'review';

type AIResult = {
  assignmentName: string;
  className: string;
  estimatedHours: number;
  reasoning: string;
  workload: string;
  confidence: string;
  factors: { label: string; value: string }[];
};

const DropView = View as any;

const SAMPLE_RESULT: AIResult = {
  assignmentName: 'Chapter 5 Reading Notes',
  className: 'Biology 101',
  estimatedHours: 2.5,
  workload: 'Medium',
  confidence: 'Good starting point',
  reasoning: 'This looks like reading, notes, and a short reflection. Two focused sittings should be enough for a first plan.',
  factors: [
    { label: 'Reading load', value: '35 pages' },
    { label: 'Writing', value: '1 page of notes' },
    { label: 'Wrap-up', value: 'Short reflection' },
  ],
};

const ADJUSTMENT_PRESETS = [
  { label: 'I read fast', delta: -0.5 },
  { label: 'Need more time', delta: 0.5 },
  { label: 'Lots of notes', delta: 1 },
  { label: 'Reset', delta: 0 },
];

function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function getFocusPlan(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const sessions = Math.max(1, Math.ceil(totalMinutes / 50));
  const minutesPerSession = Math.max(15, Math.round(totalMinutes / sessions));
  return `${sessions} focus session${sessions === 1 ? '' : 's'} of about ${minutesPerSession} min`;
}

export default function AutoAddScreen() {
  const router = useRouter();
  const { addTask } = useTasks();
  const { theme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [adjustedHours, setAdjustedHours] = useState(1);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const readAsBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  };

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to read this assignment.');
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      let base64: string;
      if (asset.base64) {
        base64 = asset.base64;
      } else {
        try {
          base64 = await readAsBase64(asset.uri);
        } catch {
          Alert.alert('Could not read image', 'Try a clearer photo or choose another file.');
          return;
        }
      }
      setImageUri(asset.uri);
      await analyzeImage(base64);
    }
  };

  const analyzeImage = async (_base64?: string) => {
    setStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 1200));
    setResult(SAMPLE_RESULT);
    setAdjustedHours(SAMPLE_RESULT.estimatedHours);
    setStep('review');
  };

  const saveAssignment = (andFocus: boolean) => {
    if (!result) return;
    const dueDateRaw = dueDate.toISOString();
    const taskId = addTask({
      assignmentName: result.assignmentName,
      className: result.className,
      description: result.reasoning,
      dueDate: dueDate.toLocaleDateString(),
      dueDateRaw,
      estimatedHours: adjustedHours,
      hoursPerDay: computeHoursPerDay(adjustedHours, dueDateRaw),
    });

    if (andFocus) {
      router.replace(`/focus?id=${taskId}`);
    } else {
      router.back();
    }
  };

  const adjustHours = (delta: number) => {
    setAdjustedHours(prev => Math.max(0.5, parseFloat((prev + delta).toFixed(1))));
  };

  const applyPreset = (delta: number) => {
    if (!result) return;
    if (delta === 0) {
      setAdjustedHours(result.estimatedHours);
      return;
    }
    adjustHours(delta);
  };

  const handleDrop = (event: any) => {
    event.preventDefault();
    setIsDragOver(false);
    const file: File | undefined = event.nativeEvent?.dataTransfer?.files?.[0];
    if (!file) {
      Alert.alert('No file found', 'Drop an assignment image.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      Alert.alert('Use an image file', 'Upload a PNG or JPG of your assignment.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageUri(dataUrl);
      analyzeImage(base64);
    };
    reader.onerror = () => {
      Alert.alert('Could not read file', 'Try uploading the image again.');
    };
    reader.readAsDataURL(file);
  };

  if (step === 'analyzing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.analyzingText}>Reading assignment...</Text>
        <Text style={styles.analyzingSub}>Making a first time plan</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
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
        <Text style={styles.heading}>Add first assignment</Text>
      </View>

      {step === 'pick' && (
        <>
          <Text style={styles.sub}>Add a photo of the assignment. You can change the time before focus starts.</Text>

          {Platform.OS === 'web' && (
            <DropView
              style={[styles.dropZone, isDragOver && styles.dropZoneActive]}
              onDragEnter={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              accessibilityLabel="Drop assignment photo here"
              accessibilityRole="button"
            >
              <Text style={styles.dropIcon}>+</Text>
              <Text style={styles.dropTitle}>{isDragOver ? 'Drop it here' : 'Drop assignment photo'}</Text>
              <Text style={styles.dropSub}>PNG or JPG</Text>
            </DropView>
          )}

          {Platform.OS !== 'web' && (
            <ThemeButton
              size="lg"
              style={styles.actionGap}
              onPress={() => pickImage(true)}
              accessibilityLabel="Take a photo of your assignment"
            >
              Take photo
            </ThemeButton>
          )}

          <ThemeButton
            size="lg"
            variant="secondary"
            style={styles.actionGap}
            onPress={() => pickImage(false)}
            accessibilityLabel="Choose a photo from your library"
          >
            Choose photo
          </ThemeButton>

          <ThemeButton
            size="lg"
            variant="secondary"
            style={styles.actionGap}
            onPress={() => analyzeImage()}
            accessibilityLabel="Use a sample assignment to try the feature"
          >
            Use sample assignment
          </ThemeButton>

          <ThemeButton variant="ghost" onPress={() => router.back()}>Cancel</ThemeButton>
        </>
      )}

      {step === 'review' && result && (
        <>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.preview}
              resizeMode="cover"
              accessibilityLabel="Photo of your assignment"
            />
          )}

          <ThemeCard style={styles.card}>
            <Text style={styles.cardLabel}>Assignment</Text>
            <Text style={styles.cardValue}>{result.assignmentName}</Text>
          </ThemeCard>

          <ThemeCard style={styles.card}>
            <Text style={styles.cardLabel}>Class</Text>
            <Text style={styles.cardValue}>{result.className}</Text>
          </ThemeCard>

          <ThemeCard variant="elevated" style={styles.estimateHero}>
            <Text style={styles.cardLabel}>Time plan</Text>
            <Text style={styles.estimateHours}>{formatHours(result.estimatedHours)}</Text>
            <Text style={styles.estimateSub}>{result.workload} workload</Text>
            <Text style={styles.confidenceText}>{result.confidence}</Text>
          </ThemeCard>

          <ThemeCard style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>Why this estimate?</Text>
              <Text style={styles.cardMeta}>You can change it</Text>
            </View>
            <Text style={styles.cardReasoning}>{result.reasoning}</Text>
            <View style={styles.factorList}>
              {result.factors.map(factor => (
                <View key={factor.label} style={styles.factorRow}>
                  <Text style={styles.factorLabel}>{factor.label}</Text>
                  <Text style={styles.factorValue}>{factor.value}</Text>
                </View>
              ))}
            </View>
          </ThemeCard>

          <Text style={styles.sectionTitle}>Adjust time</Text>
          <View style={styles.timeAdjuster}>
            <TouchableOpacity
              style={styles.adjBtn}
              onPress={() => adjustHours(-0.5)}
              accessibilityLabel="Decrease estimated hours"
              accessibilityRole="button"
            >
              <Text style={styles.adjBtnText}>-</Text>
            </TouchableOpacity>
            <View style={styles.adjustedTimeWrap}>
              <Text style={styles.hoursDisplay}>{formatHours(adjustedHours)}</Text>
              <Text style={styles.adjustedSub}>{getFocusPlan(adjustedHours)}</Text>
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

          <View style={styles.adjustPresetRow}>
            {ADJUSTMENT_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.label}
                style={styles.adjustPreset}
                onPress={() => applyPreset(preset.delta)}
                activeOpacity={0.85}
                accessibilityLabel={preset.label}
                accessibilityRole="button"
              >
                <Text style={styles.adjustPresetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ThemeCard style={styles.planCard}>
            <Text style={styles.cardLabel}>Focus plan</Text>
            <Text style={styles.planTitle}>{getFocusPlan(adjustedHours)}</Text>
            <Text style={styles.planText}>Change this later if the assignment feels easier or harder than expected.</Text>
          </ThemeCard>

          <Text style={styles.sectionTitle}>Due date</Text>
          <TouchableOpacity
            style={styles.dateTrigger}
            onPress={() => setShowDatePicker(v => !v)}
            activeOpacity={0.8}
            accessibilityLabel={`Due date: ${dueDate.toLocaleDateString()}. Tap to change.`}
            accessibilityRole="button"
          >
            <FontAwesome5 name="calendar-alt" size={14} color={theme.primary} />
            <Text style={styles.dateTriggerText}>{dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            <FontAwesome5 name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={11} color={theme.muted} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selected) setDueDate(selected);
              }}
              minimumDate={new Date()}
            />
          )}

          <ThemeButton size="lg" style={styles.saveAction} onPress={() => saveAssignment(false)}>
            Save assignment
          </ThemeButton>
          <ThemeButton variant="secondary" style={styles.focusAction} onPress={() => saveAssignment(true)}>
            Save and start focus
          </ThemeButton>
          <ThemeButton variant="ghost" onPress={() => router.back()}>Cancel</ThemeButton>
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.3,
  },
  sub: {
    color: theme.muted,
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 23,
  },
  analyzingText: {
    color: theme.text,
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  analyzingSub: {
    color: theme.muted,
    fontSize: 14,
    marginTop: 8,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 20,
  },
  card: {
    marginBottom: 12,
  },
  cardLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardValue: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardReasoning: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  estimateHero: {
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
  },
  estimateHours: {
    color: theme.text,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  estimateSub: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  confidenceText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardMeta: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  timeAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.border,
  },
  adjustedTimeWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  adjBtn: {
    backgroundColor: theme.surfaceAlt,
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '300',
  },
  hoursDisplay: {
    color: theme.text,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  adjustedSub: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },
  factorList: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  factorLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  factorValue: {
    flex: 1,
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  adjustPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  adjustPreset: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  adjustPresetText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  planCard: {
    marginTop: 14,
  },
  planTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  planText: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
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
  actionGap: { marginBottom: 12 },
  saveAction: { marginTop: 24, marginBottom: 12 },
  focusAction: { marginBottom: 12 },
  dropZone: {
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: theme.surface,
  },
  dropZoneActive: {
    borderColor: theme.primary,
    backgroundColor: theme.surfaceAlt,
  },
  dropIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  dropTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dropSub: {
    color: theme.muted,
    fontSize: 13,
  },
});
