import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore, routeForRole } from '../lib/auth';
import { colors } from '../theme/colors';

export default function Index() {
  const { token, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  // Role decides the landing surface: COACH → coach area, ADMIN → admin area
  // (added in Phase 3), USER → patient tabs.
  if (token) return <Redirect href={routeForRole(user?.role)} />;
  return <Redirect href="/onboarding" />;
}
