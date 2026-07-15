import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { PIXEL_FONT, PixelButton, PixelPanel } from '@/components/pixel-ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  const [result, setResult] = useState<AIResult | null>(null);
  const [adjustedHours, setAdjustedHours] = useState(1);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const dateInputRef = useRef<any>(null);

  const startDemo = async () => {
    setStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 600));
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

  if (step === 'analyzing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.analyzingText}>Loading the demo...</Text>
        <Text style={styles.analyzingSub}>Sample data, not a real photo</Text>
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
        <Text style={styles.heading}>Plan from photo</Text>
      </View>

      {step === 'pick' && (
        <>
          <Text style={styles.sub}>
            Soon you will snap a photo of an assignment and get a ready-made focus plan.
          </Text>

          <View style={styles.constructionCard}>
            <FontAwesome5 name="hard-hat" size={18} color={theme.primary} />
            <View style={styles.constructionCopy}>
              <Text style={styles.constructionTitle}>Photo reading is under construction</Text>
              <Text style={styles.constructionText}>
                The crew is still building this one. Try the demo below to see how it will work.
              </Text>
            </View>
          </View>

          <PixelButton
            size="lg"
            style={styles.actionGap}
            onPress={startDemo}
            accessibilityLabel="Try a demo assignment plan with sample data"
          >
            Try a demo plan
          </PixelButton>

          <PixelButton
            size="lg"
            variant="surface"
            style={styles.actionGap}
            onPress={() => router.replace('/add-task')}
            accessibilityLabel="Add an assignment manually instead"
          >
            Add manually instead
          </PixelButton>

          <PixelButton variant="ghost" onPress={() => router.back()}>Cancel</PixelButton>
        </>
      )}

      {step === 'review' && result && (
        <>
          {/* Honest demo banner */}
          <View style={styles.demoTag}>
            <FontAwesome5 name="flask" size={11} color="#1C1917" />
            <Text style={styles.demoTagText}>Demo plan · sample data</Text>
          </View>

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
          <PixelPanel style={styles.estimateHeroRim} innerStyle={styles.estimateHero}>
            <View style={styles.estimateLabelRow}>
              <Text style={styles.estimateLabel}>The plan estimates</Text>
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
          </PixelPanel>

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

              <PixelButton size="lg" onPress={() => setShowReasoning(false)}>Got it</PixelButton>
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
          <TouchableOpacity
            style={styles.dateWrapper}
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
            accessibilityLabel={`Due date: ${dueDate.toLocaleDateString()}. Tap to change.`}
            accessibilityRole="button"
          >
            <FontAwesome5 name="calendar-alt" size={14} color={theme.primary} />
            <Text style={styles.dateTriggerText}>
              {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
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
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selected) setDueDate(selected);
              }}
              minimumDate={new Date()}
              style={styles.datePicker}
            />
          )}

          <PixelButton size="lg" style={styles.saveAction} onPress={() => saveAssignment(false)}>
            Save assignment
          </PixelButton>
          <PixelButton variant="ghost" style={styles.focusAction} onPress={() => saveAssignment(true)}>
            Save and start focus now
          </PixelButton>
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
    fontSize: 20,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    color: theme.text,
    letterSpacing: 0.5,
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
  constructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  constructionCopy: { flex: 1 },
  constructionTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  constructionText: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  demoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  demoTagText: {
    color: '#1C1917',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
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

  estimateHeroRim: {
    marginBottom: 28,
  },
  estimateHero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
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
    fontSize: 56,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: -1,
    lineHeight: 66,
  },
  estimatePlan: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: PIXEL_FONT,
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

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    padding: 16,
    marginBottom: 28,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
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
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  adjustPresetActive: {
    backgroundColor: theme.primary + '28',
    borderTopColor: theme.primary,
    borderLeftColor: theme.primary,
    borderBottomColor: theme.primary,
    borderRightColor: theme.primary,
  },
  adjustPresetText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  adjustPresetTextActive: {
    color: theme.primary,
    fontWeight: '800',
  },

  datePicker: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  dateWrapper: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
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
});
