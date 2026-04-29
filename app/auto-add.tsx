import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
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
};

const DropView = View as any;

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
    console.log('[pickImage] starting, useCamera:', useCamera);
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    console.log('[pickImage] permission status:', permission.status);
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to continue.');
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });

    console.log('[pickImage] picker result canceled:', pickerResult.canceled);
    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      console.log('[pickImage] image selected, uri:', asset.uri, '| base64 length:', asset.base64?.length ?? 0);

      let base64: string;
      if (asset.base64) {
        // Native: picker returns base64 directly when base64: true is set
        base64 = asset.base64;
        console.log('[pickImage] using base64 from picker, length:', base64.length);
      } else {
        // Web: blob URI — read it manually
        try {
          base64 = await readAsBase64(asset.uri);
          console.log('[pickImage] blob read succeeded, length:', base64.length);
        } catch (e: any) {
          console.error('[pickImage] readAsBase64 failed:', e.message);
          Alert.alert('Image error', 'Could not read image data: ' + e.message);
          return;
        }
      }

      setImageUri(asset.uri);
      await analyzeImage(base64);
    } else {
      console.log('[pickImage] picker was canceled or returned no assets');
    }
  };

  const analyzeImage = async (_base64?: string) => {
    setStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 1200));
    const mock: AIResult = {
      assignmentName: 'Chapter 5 Reading Notes',
      className: 'Biology 101',
      estimatedHours: 2.5,
      workload: 'Medium',
      reasoning: 'Sample estimate: about 35 pages of reading, one notes page, and a short reflection. The AI estimates 2.5 hours, but you can adjust it to match your pace.',
    };
    setResult(mock);
    setAdjustedHours(mock.estimatedHours);
    setStep('review');
  };

  const saveAssignment = () => {
    if (!result) return;
    const dueDateRaw = dueDate.toISOString();
    addTask({
      assignmentName: result.assignmentName,
      className: result.className,
      description: result.reasoning,
      dueDate: dueDate.toLocaleDateString(),
      dueDateRaw,
      estimatedHours: adjustedHours,
      hoursPerDay: computeHoursPerDay(adjustedHours, dueDateRaw),
    });

    router.replace('/(tabs)/calendar');
  };

  const adjustHours = (delta: number) => {
    setAdjustedHours(prev => Math.max(0.5, parseFloat((prev + delta).toFixed(1))));
  };

  const handleDrop = (event: any) => {
    event.preventDefault();
    setIsDragOver(false);
    const file: File | undefined = event.nativeEvent?.dataTransfer?.files?.[0];
    console.log('[handleDrop] dropped file:', file?.name, '| type:', file?.type, '| size:', file?.size);
    if (!file) {
      Alert.alert('Drop error', 'No file detected in the drop event.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      Alert.alert('Wrong file type', `Expected an image but got: ${file.type}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      console.log('[handleDrop] FileReader loaded, base64 length:', base64?.length ?? 0);
      setImageUri(dataUrl);
      analyzeImage(base64);
    };
    reader.onerror = (e) => {
      console.error('[handleDrop] FileReader error:', e);
      Alert.alert('File read error', 'Could not read the dropped file.');
    };
    reader.readAsDataURL(file);
  };

  if (step === 'analyzing') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.analyzingText, { color: theme.text }]}>Estimating assignment time...</Text>
        <Text style={[styles.analyzingSub, { color: theme.muted }]}>Using a sample AI result for now</Text>
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
        <Text style={styles.heading}>AI Assignment Estimate</Text>
      </View>

      {step === 'pick' && (
        <>
          <Text style={styles.sub}>Take or upload an assignment. The AI estimates how long it should take, then you can adjust the time before saving.</Text>

          {Platform.OS === 'web' && (
            <DropView
              style={[styles.dropZone, isDragOver && styles.dropZoneActive]}
              onDragEnter={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Text style={styles.dropIcon}>☁️</Text>
              <Text style={styles.dropTitle}>{isDragOver ? 'Drop it!' : 'Drag & drop here'}</Text>
              <Text style={styles.dropSub}>PNG, JPG supported</Text>
            </DropView>
          )}

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
              <Text style={styles.primaryButtonIcon}>📷</Text>
              <Text style={styles.primaryButtonText}>Take a Photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
            <Text style={styles.secondaryButtonIcon}>🖼️</Text>
            <Text style={styles.secondaryButtonText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sampleButton} onPress={() => analyzeImage()}>
            <Text style={styles.sampleButtonText}>Use sample assignment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'review' && result && (
        <>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          )}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Assignment</Text>
            <Text style={styles.cardValue}>{result.assignmentName}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Class</Text>
            <Text style={styles.cardValue}>{result.className}</Text>
          </View>
          <View style={styles.estimateHero}>
            <Text style={styles.cardLabel}>AI estimate</Text>
            <Text style={styles.estimateHours}>{result.estimatedHours}h</Text>
            <Text style={styles.estimateSub}>{result.workload} workload</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Why this estimate?</Text>
            <Text style={styles.cardReasoning}>{result.reasoning}</Text>
          </View>

          <Text style={styles.sectionTitle}>Adjust estimated time</Text>
          <View style={styles.timeAdjuster}>
            <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHours(-0.5)}>
              <Text style={styles.adjBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.hoursDisplay}>{adjustedHours}h</Text>
            <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHours(0.5)}>
              <Text style={styles.adjBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Due Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>{dueDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

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

          <TouchableOpacity style={[styles.primaryButton, { marginTop: 24 }]} onPress={saveAssignment}>
            <Text style={styles.primaryButtonText}>Save assignment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252525',
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
    backgroundColor: '#6C63FF22',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6C63FF66',
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
  dateButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252525',
  },
  dateButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
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
  primaryButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonIcon: {
    fontSize: 20,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  secondaryButtonIcon: {
    fontSize: 20,
  },
  secondaryButtonText: {
    color: '#6C63FF',
    fontSize: 17,
    fontWeight: '600',
  },
  sampleButton: {
    backgroundColor: '#6C63FF22',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6C63FF66',
  },
  sampleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
  },
});
