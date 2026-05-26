import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Button } from '../../components/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  function getErrorMessage(err: any, fallback: string) {
    const error = err?.response?.data?.error;
    return typeof error === 'string' ? error : fallback;
  }

  async function handleRequestOtp() {
    if (!email.trim()) { Alert.alert('Enter your email'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-email-otp', {
        email: email.trim(),
        mode: 'login',
      });
      const devOtp = data?.devOnly?.otp;
      if (devOtp) setOtp(devOtp);
      setOtpSent(true);
      Alert.alert('Code sent', devOtp ? `Development code: ${devOtp}` : 'Check your email for your MANAS login code.');
    } catch (err: any) {
      Alert.alert('Code request failed', getErrorMessage(err, 'Please try again'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) { Alert.alert('Enter the code from your email'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email-otp', {
        email: email.trim(),
        otp: otp.trim(),
        mode: 'login',
      });
      await setAuth(data.token, data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login failed', getErrorMessage(err, 'Please try again'));
    } finally {
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    setOtpSent(false);
    setOtp('');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Welcome{'\n'}<Text style={styles.headingItalic}>back.</Text></Text>
          <Text style={styles.sub}>Sign in with a secure code sent to your email.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                editable={!otpSent}
                placeholder="sarah@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {otpSent ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Login code</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="123456"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity onPress={handleChangeEmail} style={styles.inlineAction}>
                  <Text style={styles.inlineActionText}>Use a different email</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <Button
              label={loading ? 'Please wait...' : otpSent ? 'Verify and sign in' : 'Send login code'}
              onPress={otpSent ? handleVerifyOtp : handleRequestOtp}
              loading={loading}
            />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchLink}>Begin →</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 24, flexGrow: 1 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  backText: { fontSize: 18, color: colors.ink },
  heading: { fontFamily: fontFamilies.fraunces, fontSize: 34, color: colors.ink, letterSpacing: -0.5, lineHeight: 36 },
  headingItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.5 },
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
  otpInput: { letterSpacing: 4, textAlign: 'center', fontFamily: fontFamilies.dmSansMedium },
  inlineAction: { alignSelf: 'center', paddingVertical: 2 },
  inlineActionText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.blue },
  switchRow: { alignItems: 'center', marginTop: 24 },
  switchText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted },
  switchLink: { color: colors.blue, fontFamily: fontFamilies.dmSansMedium },
});
