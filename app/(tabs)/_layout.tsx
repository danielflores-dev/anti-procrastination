import { useCoins } from '@/context/CoinContext';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { coins } = useCoins();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: `Shop`,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🪙</Text>,
          tabBarBadge: coins > 0 ? coins : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F59E0B', color: '#000', fontSize: 10, fontWeight: '700' },
        }}
      />
    </Tabs>
  );
}
