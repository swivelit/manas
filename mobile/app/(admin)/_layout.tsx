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

// Minimum-viable admin area (PDF §4.C). NOTE: a richer web admin dashboard is a
// v1.1 candidate; this mobile area satisfies the v1 role requirement.
export default function AdminLayout() {
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
      <Tabs.Screen name="dashboard" options={{ title: 'Overview', tabBarIcon: ({ focused }) => <TabIcon name="gauge" focused={focused} /> }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: ({ focused }) => <TabIcon name="group" focused={focused} /> }} />
      <Tabs.Screen name="coaches" options={{ title: 'Coaches', tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }} />
      <Tabs.Screen name="content" options={{ title: 'Content', tabBarIcon: ({ focused }) => <TabIcon name="video" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 99, backgroundColor: colors.pink },
});
