import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { ThemeButton, ThemeCard } from '@/components/ui/design-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type Step = 'pick' | 'analyzing' | 'review';

type AIResult = {
  assignmentName: string;
  className: string;
  estimatedHours: number;
  reasoning: string;
  workload: string;
  confidence: string;
  factors: {
    label: string;
    value: string;
  }[];
};

const DropView = View as any;
const SAMPLE_RESULT: AIResult = {
  assignmentName: 'Chapter 5 Reading Notes',
  className: 'Biology 101',
  estimatedHours: 2.5,
  workload: 'Medium',
  confidence: 'Good starting point',
  reasoning: 'Based on the page count, notes, and a short reflection, this should take about two focused sittings. Adjust it if your class usually takes longer.',
  factors: [
    { label: 'Reading load', value: '35 pages' },
    { label: 'Writing', value: '1 page of notes' },
    { label: 'Wrap-up', value: 'Short reflection' },
  ],
};

const ADJUSTMENT_PRESETS = [
  { label: 'I read fast', delta: -0.5 },
  { label: 'Need breaks', delta: 0.5 },
  { label: 'Heavy notes', delta: 1 },
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

  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [adjustedHours, setAdjustedHours] = useState(1);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const readAsBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      // On web the picker returns a blob: URI — fetch it and use FileReader.
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    // On native use expo-file-system which can read any local file URI.
    return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  };

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access so we can estimate this assignment.');
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];

      let base64: string;
      if (asset.base64) {
        // Native: picker returns base64 directly when base64: true is set
        base64 = asset.base64;
      } else {
        // Web: blob URI — read it manually
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

  const saveAssignment = () => {
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

    router.replace(`/focus?id=${taskId}`);
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
      Alert.alert('No file found', 'Drop an image file of your assignment.');
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
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.analyzingText, { color: theme.text }]}>Estimating study time...</Text>
        <Text style={[styles.analyzingSub, { color: theme.muted }]}>Reading the assignment details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.background }]} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Add first assignment</Text>
      </View>

      {step === 'pick' && (
        <>
          <Text style={styles.sub}>Upload the assignment sheet or try the built-in example. You can adjust the time before focus starts.</Text>

          {Platform.OS === 'web' && (
            <DropView
              style={[styles.dropZone, isDragOver && styles.dropZoneActive]}
              onDragEnter={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Text style={styles.dropIcon}>☁️</Text>
              <Text style={styles.dropTitle}>{isDragOver ? 'Drop the image' : 'Drop assignment image'}</Text>
              <Text style={styles.dropSub}>PNG or JPG</Text>
            </DropView>
          )}

          {Platform.OS !== 'web' && (
            <ThemeButton size="lg" style={styles.actionGap} onPress={() => pickImage(true)}>
              Take photo
            </ThemeButton>
          )}

          <ThemeButton size="lg" variant="secondary" style={styles.actionGap} onPress={() => pickImage(false)}>
            Choose photo
          </ThemeButton>

          <ThemeButton size="lg" variant="secondary" style={styles.actionGap} onPress={() => analyzeImage()}>
            Try example assignment
          </ThemeButton>

          <ThemeButton variant="ghost" onPress={() => router.back()}>Cancel</ThemeButton>
        </>
      )}

      {step === 'review' && result && (
        <>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
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
            <Text style={styles.cardLabel}>Estimated time</Text>
            <Text style={styles.estimateHours}>{formatHours(result.estimatedHours)}</Text>
            <Text style={styles.estimateSub}>{result.workload} workload</Text>
            <Text style={styles.confidenceText}>{result.confidence}</Text>
          </ThemeCard>
          <ThemeCard style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>Why this time?</Text>
              <Text style={styles.cardMeta}>Editable</Text>
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

          <Text style={styles.sectionTitle}>Your time</Text>
          <View style={styles.timeAdjuster}>
            <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHours(-0.5)}>
              <Text style={styles.adjBtnText}>-</Text>
            </TouchableOpacity>
            <View style={styles.adjustedTimeWrap}>
              <Text style={styles.hoursDisplay}>{formatHours(adjustedHours)}</Text>
              <Text style={styles.adjustedSub}>{getFocusPlan(adjustedHours)}</Text>
            </View>
            <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHours(0.5)}>
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
              >
                <Text style={styles.adjustPresetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ThemeCard style={styles.planCard}>
            <Text style={styles.cardLabel}>Focus plan</Text>
            <Text style={styles.planTitle}>{getFocusPlan(adjustedHours)}</Text>
            <Text style={styles.planText}>You can change this later if the assignment feels easier or harder than expected.</Text>
          </ThemeCard>

          <Text style={styles.sectionTitle}>Due date</Text>
          <ThemeButton variant="secondary" onPress={() => setShowDatePicker(true)}>
            {dueDate.toLocaleDateString()}
          </ThemeButton>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selected) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selected) setDueDate(selected);
              }}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          )}

          <ThemeButton size="lg" style={styles.saveAction} onPress={saveAssignment}>
            Save and start focus
          </ThemeButton>
          <ThemeButton variant="ghost" onPress={() => router.back()}>Cancel</ThemeButton>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0f0f0f' },
  container: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 10,
  },
  backArrow: {
    color: '#6C63FF',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  sub: {
    color: '#666',
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 23,
  },
  analyzingText: {
    color: '#aaaaaa',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  analyzingSub: {
    color: '#555',
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
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardReasoning: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  estimateHero: {
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
  },
  estimateHours: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  estimateSub: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  confidenceText: {
    color: '#B8B5FF',
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
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#777',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#252525',
  },
  adjustedTimeWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  adjBtn: {
    backgroundColor: '#252525',
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
  hoursDisplay: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  adjustedSub: {
    color: '#777',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },
  factorList: {
    borderTopWidth: 1,
    borderTopColor: '#252525',
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
    color: '#777',
    fontSize: 12,
    fontWeight: '700',
  },
  factorValue: {
    flex: 1,
    color: '#ffffff',
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
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  adjustPresetText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  planCard: {
    marginTop: 14,
  },
  planTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  planText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
  },
  actionGap: { marginBottom: 12 },
  saveAction: { marginTop: 24, marginBottom: 12 },
  dropZone: {
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#141414',
  },
  dropZoneActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#1e1a2e',
  },
  dropIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  dropTitle: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dropSub: {
    color: '#555',
    fontSize: 13,
  },
});

