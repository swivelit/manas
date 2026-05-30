import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Icon name={name} size={20} color={focused ? colors.ink : '#C9C0AD'} strokeWidth={focused ? 2 : 1.5} />
      {focused && <View style={styles.dot} />}
    </View>
  );
}

// Minimum-viable coach area (PDF §4.B). Three surfaces: appointments,
// availability, and content upload. Gated to COACH role by app/index.tsx routing.
export default function CoachLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'DMSans_500Medium' },
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 18,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="appointments"
        options={{ title: 'Appointments', tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} /> }}
      />
      <Tabs.Screen
        name="availability"
        options={{ title: 'Availability', tabBarIcon: ({ focused }) => <TabIcon name="clock" focused={focused} /> }}
      />
      <Tabs.Screen
        name="upload"
        options={{ title: 'Add video', tabBarIcon: ({ focused }) => <TabIcon name="video" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 99, backgroundColor: colors.pink },
});
