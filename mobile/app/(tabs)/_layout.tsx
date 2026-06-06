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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 18,
          paddingTop: 14,
          paddingHorizontal: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="topics"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} /> }}
      />
      <Tabs.Screen
        name="videos"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="play" focused={focused} /> }}
      />
      <Tabs.Screen
        name="sessions"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 99, backgroundColor: colors.pink },
});
