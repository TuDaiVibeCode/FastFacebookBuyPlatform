import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0B57D0',
        tabBarInactiveTintColor: isDark ? '#A8C7FA' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: isDark ? '#334155' : '#D6E4F5',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="chat-bubble" color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="storefront" color={color} />,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Auth',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
