import { Silkscreen_400Regular, Silkscreen_700Bold, useFonts } from '@expo-google-fonts/silkscreen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initNotifications } from '@/components/reminders';
import { CoinProvider } from '@/context/CoinContext';
import { PowerUpProvider } from '@/context/PowerUpContext';
import { SchoolThemeProvider } from '@/context/SchoolThemeContext';
import { TaskProvider } from '@/context/TaskContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Silkscreen_400Regular, Silkscreen_700Bold });

  useEffect(() => {
    initNotifications();
  }, []);

  // Hold the first frame until the pixel font is ready so text never swaps.
  if (!fontsLoaded) return null;

  return (
    <SchoolThemeProvider>
      <CoinProvider>
        <PowerUpProvider>
          <TaskProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="add-task" />
              <Stack.Screen name="auto-add" />
              <Stack.Screen name="focus" />
            </Stack>
          </TaskProvider>
        </PowerUpProvider>
      </CoinProvider>
    </SchoolThemeProvider>
  );
}
