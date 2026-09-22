import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore, routeForRole } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Button } from '../../components/Button';
import { useDialog } from '../../components/AppDialog';

export default function SetPassword() {
  const dialog = useDialog();
  const user = useAuthStore(s => s.user);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSetPassword() {
    if (!password) {
      void dialog.alert('Enter a password');
      return;
    }

    if (password.length < 8) {
      void dialog.alert('Password too short', 'Your password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      void dialog.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/set-password', {
        password,
      });

      if (user) {
        router.replace(routeForRole(user.role));
      }
    } catch (err: any) {
      const error = err?.response?.data?.error;
      void dialog.alert(
        'Could not set password',
        typeof error === 'string' ? error : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding'  : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.heading}>
            Set your{'\n'}
            <Text style={styles.headingItalic}>password.</Text>
          </Text>

          <Text style={styles.sub}>
            Your account is ready. Create a password so you can sign in with it next time.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Enter your password again"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>

            <Button
              label={loading ? 'Please wait...' : 'Set password'}
              onPress={handleSetPassword}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
     flexGrow: 1,
     padding: 24,
     paddingTop: 40,
     paddingBottom: 120,
  },
  heading: {
    fontFamily: fontFamilies.fraunces,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headingItalic: {
    fontFamily: fontFamilies.frauncesItalic,
    color: colors.pink,
  },
  sub: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 13,
    fontFamily: fontFamilies.dmSans,
    fontSize: 14,
    color: colors.ink,
  },
});