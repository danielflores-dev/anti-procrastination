import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { ThemeButton, ThemeCard } from '@/components/ui/design-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
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
  { label: 'Feels right', delta: 0 },
  { label: 'Need more time', delta: 0.5 },
  { label: 'Lots of notes', delta: 1 },
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

function getTimeTip(hours: number): { emoji: string; tip: string } {
  if (hours <= 0.5) {
    return {
      emoji: '⚡',
      tip: 'Quick one! Set a timer for 30 minutes, close your notifications, and knock it out in one shot.',
    };
  }
  if (hours <= 1.5) {
    return {
      emoji: '🎯',
      tip: 'Do it in one focused session. Start with the hardest part while your brain is fresh, then wrap up the easier bits.',
    };
  }
  if (hours <= 3) {
    return {
      emoji: '✂️',
      tip: `Split it into two sessions. First session: read and understand. Second session: write and finish. Rest in between — seriously, it helps.`,
    };
  }
  if (hours <= 5) {
    return {
      emoji: '📅',
      tip: 'Spread this over two or three days. Do 45-minute chunks, then take a real break. Trying to cram it all in at once usually backfires.',
    };
  }
  return {
    emoji: '🗓️',
    tip: 'Start early — this one needs multiple days. Plan short daily sessions and track what you finish each time so it doesn\'t feel overwhelming.',
  };
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
  const [showReasoning, setShowReasoning] = useState(false);

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

  const applyPreset = useCallback((delta: number) => {
    if (!result) return;
    if (delta === 0) {
      setAdjustedHours(result.estimatedHours);
      return;
    }
    adjustHours(delta);
  }, [result]);

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

          {/* Assignment + class summary row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Assignment</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>{result.assignmentName}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Class</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>{result.className}</Text>
            </View>
          </View>

          {/* Time estimate hero */}
          <ThemeCard variant="elevated" style={styles.estimateHero}>
            <View style={styles.estimateLabelRow}>
              <Text style={styles.estimateLabel}>We think it'll take</Text>
              <TouchableOpacity
                onPress={() => setShowReasoning(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Why does it take this long?"
                accessibilityRole="button"
                style={styles.whyBtn}
              >
                <FontAwesome5 name="question-circle" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.estimateHours}>{formatHours(adjustedHours)}</Text>
            <Text style={styles.estimatePlan}>{getFocusPlan(adjustedHours)}</Text>
          </ThemeCard>

          {/* Reasoning modal */}
          <Modal
            visible={showReasoning}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowReasoning(false)}
          >
            <View style={styles.reasoningModal}>
              <View style={styles.reasoningHeader}>
                <Text style={styles.reasoningTitle}>Why {formatHours(result.estimatedHours)}?</Text>
                <TouchableOpacity
                  onPress={() => setShowReasoning(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Close explanation"
                  accessibilityRole="button"
                >
                  <FontAwesome5 name="times" size={18} color={theme.muted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.reasoningText}>{result.reasoning}</Text>

              <View style={styles.reasoningDivider} />

              <Text style={styles.reasoningBreakdownTitle}>Here's the breakdown</Text>
              {result.factors.map(factor => (
                <View key={factor.label} style={styles.reasoningFactor}>
                  <View style={styles.reasoningFactorDot} />
                  <View style={styles.reasoningFactorBody}>
                    <Text style={styles.reasoningFactorLabel}>{factor.label}</Text>
                    <Text style={styles.reasoningFactorValue}>{factor.value}</Text>
                  </View>
                </View>
              ))}

              {/* Tip */}
              {(() => {
                const { emoji, tip } = getTimeTip(adjustedHours);
                return (
                  <View style={styles.tipCard}>
                    <Text style={styles.tipEmoji}>{emoji}</Text>
                    <View style={styles.tipBody}>
                      <Text style={styles.tipLabel}>How to use this time</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.reasoningFooter}>
                <Text style={styles.reasoningFooterText}>You can always adjust the time using the chips below.</Text>
              </View>

              <Pressable style={styles.reasoningDismiss} onPress={() => setShowReasoning(false)}>
                <Text style={styles.reasoningDismissText}>Got it</Text>
              </Pressable>
            </View>
          </Modal>

          {/* Tap-to-adjust chips */}
          <Text style={styles.adjustQuestion}>Does that feel right?</Text>
          <View style={styles.adjustPresetRow}>
            {ADJUSTMENT_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.adjustPreset,
                  preset.delta === 0 && adjustedHours === result.estimatedHours && styles.adjustPresetActive,
                ]}
                onPress={() => applyPreset(preset.delta)}
                activeOpacity={0.8}
                accessibilityLabel={preset.label}
                accessibilityRole="button"
              >
                <Text style={[
                  styles.adjustPresetText,
                  preset.delta === 0 && adjustedHours === result.estimatedHours && styles.adjustPresetTextActive,
                ]}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Due date */}
          <Text style={styles.adjustQuestion}>When is it due?</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.dateWrapper}>
              <FontAwesome5 name="calendar-alt" size={14} color={theme.primary} />
              <Text style={styles.dateTriggerText}>
                {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <FontAwesome5 name="chevron-down" size={11} color={theme.muted} />
              <input
                type="date"
                value={dueDate.toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e: any) => {
                  if (e.target.value) {
                    const d = new Date(e.target.value + 'T12:00:00');
                    if (!isNaN(d.getTime())) setDueDate(d);
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                } as any}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateWrapper}
                onPress={() => setShowDatePicker(v => !v)}
                activeOpacity={0.8}
                accessibilityLabel={`Due date: ${dueDate.toLocaleDateString()}. Tap to change.`}
                accessibilityRole="button"
              >
                <FontAwesome5 name="calendar-alt" size={14} color={theme.primary} />
                <Text style={styles.dateTriggerText}>
                  {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <FontAwesome5 name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={11} color={theme.muted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selected) setDueDate(selected);
                  }}
                  minimumDate={new Date()}
                  style={styles.datePicker}
                />
              )}
            </>
          )}

          <ThemeButton size="lg" style={styles.saveAction} onPress={() => saveAssignment(false)}>
            Save assignment
          </ThemeButton>
          <ThemeButton variant="ghost" style={styles.focusAction} onPress={() => saveAssignment(true)}>
            Save and start focus now
          </ThemeButton>
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
    height: 180,
    borderRadius: 14,
    marginBottom: 20,
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryBlock: {
    flex: 1,
    padding: 14,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.border,
  },
  summaryLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  summaryValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  estimateHero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  estimateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  estimateLabel: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  whyBtn: {
    opacity: 0.85,
  },
  estimateHours: {
    color: theme.text,
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 72,
  },
  estimatePlan: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },

  reasoningModal: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reasoningTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  reasoningText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
  },
  reasoningDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginBottom: 20,
  },
  reasoningBreakdownTitle: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  reasoningFactor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  reasoningFactorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
    marginTop: 6,
  },
  reasoningFactorBody: {
    flex: 1,
  },
  reasoningFactorLabel: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  reasoningFactorValue: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  reasoningFooter: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    marginBottom: 28,
  },
  reasoningFooterText: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  reasoningDismiss: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reasoningDismissText: {
    color: theme.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tipEmoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  tipBody: {
    flex: 1,
  },
  tipLabel: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  tipText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },

  adjustQuestion: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  adjustPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  adjustPreset: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  adjustPresetActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '18',
  },
  adjustPresetText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  adjustPresetTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },

  datePicker: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  dateWrapper: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  dateTriggerText: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  actionGap: { marginBottom: 12 },
  saveAction: { marginTop: 28, marginBottom: 12 },
  focusAction: { marginBottom: 8 },
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
