import { computeHoursPerDay, useTasks } from '@/context/TaskContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Calendar from 'expo-calendar';
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

type Step = 'pick' | 'analyzing' | 'review' | 'calendar';

type AIResult = {
  assignmentName: string;
  className: string;
  estimatedHours: number;
  reasoning: string;
};

export default function AutoAddScreen() {
  const router = useRouter();
  const { addTask } = useTasks();

  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
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
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
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
      setImageBase64(base64);
      await analyzeImage(base64);
    } else {
      console.log('[pickImage] picker was canceled or returned no assets');
    }
  };

  const analyzeImage = async (_base64: string) => {
    setStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mock: AIResult = {
      assignmentName: 'Chapter 5 Reading',
      className: 'Biology 101',
      estimatedHours: 2.5,
      reasoning: 'Mock response — real API call disabled.',
    };
    setResult(mock);
    setAdjustedHours(mock.estimatedHours);
    setStep('review');
  };

  const addToCalendar = async () => {
    if (!result) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Calendar access is needed to add the event.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = calendars.find(c => c.allowsModifications);
      if (!writable) {
        Alert.alert('No calendar found', 'Could not find a writable calendar on this device.');
        return;
      }

      const startDate = new Date(dueDate);
      startDate.setHours(startDate.getHours() - adjustedHours);
      const endDate = new Date(dueDate);

      await Calendar.createEventAsync(writable.id, {
        title: result.assignmentName,
        notes: `Class: ${result.className}\nEstimated time: ${adjustedHours}h`,
        startDate,
        endDate,
        alarms: [{ relativeOffset: -60 }],
      });

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
    } catch (e: any) {
      Alert.alert('Calendar error', e.message ?? 'Could not add event.');
    }
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.analyzingText}>Analyzing assignment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Automatically Add Assignment</Text>

      {step === 'pick' && (
        <>
          <Text style={styles.sub}>Take a photo, upload a screenshot, or drag one in.</Text>

          {Platform.OS === 'web' && (
            <View
              style={[styles.dropZone, isDragOver && styles.dropZoneActive]}
              onDragEnter={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Text style={styles.dropIcon}>⬆</Text>
              <Text style={styles.dropText}>
                {isDragOver ? 'Drop it!' : 'Drag & drop an image here'}
              </Text>
            </View>
          )}

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
            <Text style={styles.secondaryButtonText}>Choose from Library</Text>
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
          <View style={styles.card}>
            <Text style={styles.cardLabel}>AI Reasoning</Text>
            <Text style={styles.cardReasoning}>{result.reasoning}</Text>
          </View>

          <Text style={styles.sectionTitle}>Estimated Time</Text>
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

          <TouchableOpacity style={[styles.primaryButton, { marginTop: 24 }]} onPress={addToCalendar}>
            <Text style={styles.primaryButtonText}>Add to Calendar</Text>
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
  scroll: { flex: 1, backgroundColor: '#121212' },
  container: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  sub: {
    color: '#aaaaaa',
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 22,
  },
  analyzingText: {
    color: '#aaaaaa',
    fontSize: 16,
    marginTop: 20,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: {
    color: '#888',
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
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  timeAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'space-between',
  },
  adjBtn: {
    backgroundColor: '#2e2e2e',
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
  },
  dateButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  dropZone: {
    borderWidth: 2,
    borderColor: '#3a3a3a',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
  },
  dropZoneActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#1e1a2e',
  },
  dropIcon: {
    fontSize: 32,
    marginBottom: 10,
    color: '#555',
  },
  dropText: {
    color: '#888',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#6C63FF',
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
