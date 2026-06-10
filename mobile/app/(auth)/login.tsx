import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore, routeForRole } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Button } from '../../components/Button';
import { useDialog } from '../../components/AppDialog';

type LoginMode = 'otp' | 'password';

export default function Login() {
  const dialog = useDialog();
  const [mode, setMode] = useState<LoginMode>('otp');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  function getErrorMessage(err: any, fallback: string) {
    const error = err?.response?.data?.error;
    return typeof error === 'string' ? error : fallback;
  }

  async function handleRequestOtp() {
    if (!email.trim()) { void dialog.alert('Enter your email'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-email-otp', {
        email: email.trim(),
        mode: 'login',
      });
      const devOtp = data?.devOnly?.otp;
      if (devOtp) setOtp(devOtp);
      setOtpSent(true);
      void dialog.alert('Code sent', devOtp ? `Development code: ${devOtp}` : 'Check your email for your MANAS login code.');
    } catch (err: any) {
      void dialog.alert('Code request failed', getErrorMessage(err, 'Please try again'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) { void dialog.alert('Enter the code from your email'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email-otp', {
        email: email.trim(),
        otp: otp.trim(),
        mode: 'login',
      });
      await setAuth(data.token, data.user);
      router.replace(routeForRole(data.user.role));
    } catch (err: any) {
      void dialog.alert('Login failed', getErrorMessage(err, 'Please try again'));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin() {
    if (!email.trim()) { void dialog.alert('Enter your email'); return; }
    if (!password) { void dialog.alert('Enter your password'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });
      await setAuth(data.token, data.user);
      router.replace(routeForRole(data.user.role));
    } catch (err: any) {
      void dialog.alert('Login failed', getErrorMessage(err, 'Please try again'));
    } finally {
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    setOtpSent(false);
    setOtp('');
  }

  function switchMode(nextMode: LoginMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setOtpSent(false);
    setOtp('');
    setPassword('');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Welcome{'\n'}<Text style={styles.headingItalic}>back.</Text></Text>
          <Text style={styles.sub}>
            {mode === 'otp'
              ? 'Sign in with a secure code sent to your email.'
              : 'Use Password mode for seeded README demo accounts.'}
          </Text>

          <View style={styles.form}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                onPress={() => switchMode('otp')}
                style={[styles.modeOption, mode === 'otp' && styles.modeOptionActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modeText, mode === 'otp' && styles.modeTextActive]}>Email code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => switchMode('password')}
                style={[styles.modeOption, mode === 'password' && styles.modeOptionActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modeText, mode === 'password' && styles.modeTextActive]}>Password</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                editable={mode === 'password' || !otpSent}
                placeholder="sarah@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode === 'password' ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Use the README password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                  />
                </View>

                <Text style={styles.modeHint}>
                  For seeded QA accounts, choose Password mode and enter the README credentials.
                </Text>
              </>
            ) : otpSent ? (
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
              label={loading ? 'Please wait...' : mode === 'password' ? 'Sign in with password' : otpSent ? 'Verify and sign in' : 'Send login code'}
              onPress={mode === 'password' ? handlePasswordLogin : otpSent ? handleVerifyOtp : handleRequestOtp}
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
  modeToggle: { flexDirection: 'row', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 99, padding: 4 },
  modeOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 99, paddingVertical: 9 },
  modeOptionActive: { backgroundColor: colors.ink },
  modeText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.inkSoft },
  modeTextActive: { color: colors.cream },
  modeHint: { fontFamily: fontFamilies.dmSans, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: -4 },
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
