import { useCoins } from '@/context/CoinContext';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ComponentProps, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

type TabIconName = ComponentProps<typeof FontAwesome5>['name'];

function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      lift.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, lift, reducedMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ translateY: lift }, { scale }] }}>
      <FontAwesome5 name={name} size={20} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { coins } = useCoins();
  const { theme } = useSchoolTheme();
  const activeTint = theme.primary;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 14,
          paddingTop: 8,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', letterSpacing: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="single-player"
        options={{
          title: 'Work',
          tabBarIcon: ({ color, focused }) => <TabIcon name="tasks" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="multi-player"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => <TabIcon name="user-friends" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar-alt" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused }) => <TabIcon name="coins" color={color} focused={focused} />,
          tabBarBadge: coins > 0 ? coins : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.primary, color: theme.onPrimary, fontSize: 10, fontWeight: '700' },
        }}
      />
    </Tabs>
  );
}
