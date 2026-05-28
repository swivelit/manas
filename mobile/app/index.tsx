import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../lib/auth';
import { colors } from '../theme/colors';

export default function Index() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  if (token) return <Redirect href="/(tabs)" />;
  return <Redirect href="/onboarding" />;
}
