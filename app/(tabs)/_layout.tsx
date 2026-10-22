import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, shadow } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ active, idle, focused, color, size }: { active: IconName; idle: IconName; focused: boolean; color: ColorValue; size: number }) {
  return <Ionicons name={focused ? active : idle} size={size} color={color} />;
}

const icon =
  (active: IconName, idle: IconName) =>
  // eslint-disable-next-line react/display-name
  (p: { focused: boolean; color: ColorValue; size: number }) => <TabIcon active={active} idle={idle} {...p} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.sub,
        tabBarLabelStyle: { fontFamily: fonts.m, fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 66,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 26,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          ...shadow,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'โน้ต', tabBarIcon: icon('document-text', 'document-text-outline') }} />
      <Tabs.Screen name="tasks" options={{ title: 'งานของฉัน', tabBarIcon: icon('checkbox', 'checkbox-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'โปรไฟล์', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
