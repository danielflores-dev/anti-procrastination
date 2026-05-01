import { useCoins } from '@/context/CoinContext';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Alert } from 'react-native';

const MULTIPLAYER_HELP =
  'This mode will let you search you univeristy and you can create or find a study group for people in your major or related field';

export default function TabsLayout() {
  const { coins } = useCoins();
  const { theme } = useSchoolTheme();
  const activeTint = theme.school ? theme.secondary : theme.primary;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
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
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="single-player"
        options={{
          title: 'Single',
          tabBarIcon: ({ color }) => <FontAwesome5 name="tasks" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="multi-player"
        listeners={{
          tabPress: () => {
            Alert.alert('Multi-player', MULTIPLAYER_HELP);
          },
        }}
        options={{
          title: 'Multi-player',
          tabBarIcon: ({ color }) => <FontAwesome5 name="user-friends" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          href: null,
          tabBarIcon: ({ color }) => <FontAwesome5 name="calendar-alt" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <FontAwesome5 name="coins" size={20} color={color} />,
          tabBarBadge: coins > 0 ? coins : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.secondary, color: theme.school ? '#111' : theme.text, fontSize: 10, fontWeight: '700' },
        }}
      />
    </Tabs>
  );
}
