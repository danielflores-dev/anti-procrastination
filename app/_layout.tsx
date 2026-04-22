import { Stack } from 'expo-router';
import { CoinProvider } from '@/context/CoinContext';
import { TaskProvider } from '@/context/TaskContext';

export default function RootLayout() {
  return (
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
  );
}
