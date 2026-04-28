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
          backgroundColor: '#141414',
          borderTopColor: '#222',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 16,
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🪙</Text>,
          tabBarBadge: coins > 0 ? coins : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F59E0B', color: '#000', fontSize: 10, fontWeight: '700' },
        }}
      />
    </Tabs>
  );
}
