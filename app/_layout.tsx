import { Stack } from 'expo-router';
import { CoinProvider } from '@/context/CoinContext';
import { SchoolThemeProvider } from '@/context/SchoolThemeContext';
import { TaskProvider } from '@/context/TaskContext';

export default function RootLayout() {
  return (
    <SchoolThemeProvider>
      <CoinProvider>
        <TaskProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-task" />
            <Stack.Screen name="auto-add" />
            <Stack.Screen name="focus" />
          </Stack>
        </TaskProvider>
      </CoinProvider>
    </SchoolThemeProvider>
  );
}
