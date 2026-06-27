import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

const tint = '#0f766e';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Deals',
          tabBarIcon: ({ color }) => <MaterialIcons name="local-offer" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ color }) => <MaterialIcons name="monitor-heart" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
