import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initNotifications } from '@/components/reminders';
import { CoinProvider } from '@/context/CoinContext';
import { PowerUpProvider } from '@/context/PowerUpContext';
import { SchoolThemeProvider } from '@/context/SchoolThemeContext';
import { TaskProvider } from '@/context/TaskContext';

export default function RootLayout() {
  useEffect(() => {
    initNotifications();
  }, []);

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
