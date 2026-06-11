import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Keyboard, KeyboardAvoidingView, Platform, ScrollView,
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
  const scrollRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<LoginMode>('otp');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const trimmedEmail = email.trim();
  const passwordEmailNeedsDomain = mode === 'password' && trimmedEmail.length > 0 && !trimmedEmail.includes('@');

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (mode === 'password') {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [mode]);

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
    if (!trimmedEmail) { void dialog.alert('Enter your email'); return; }
    if (!trimmedEmail.includes('@')) {
      void dialog.alert('Use full email', 'Enter the full email address, for example admin@manas.app.');
      return;
    }
    if (!password) { void dialog.alert('Enter your password'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: trimmedEmail,
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
    setPasswordVisible(false);
    if (nextMode === 'password') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function scrollPasswordIntoView() {
    if (Platform.OS === 'android') {
      [100, 350, 700].forEach(delay => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), delay);
      });
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.keyboard}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
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
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={scrollPasswordIntoView}
                      placeholder="Use the README password"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                    />
                    <TouchableOpacity
                      onPress={() => setPasswordVisible(v => !v)}
                      style={styles.passwordToggle}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.modeHint}>
                  Admin: use the full email, for example admin@manas.app.
                </Text>
                {passwordEmailNeedsDomain ? (
                  <Text style={styles.validationText}>Enter the full email address, not just "{trimmedEmail}".</Text>
                ) : null}
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

          {Platform.OS === 'android' && keyboardVisible && mode === 'password' ? (
            <View style={styles.keyboardSpacer} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  keyboard: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 140, flexGrow: 1 },
  keyboardSpacer: { height: 220 },
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
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  passwordInput: { flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingRight: 8 },
  passwordToggle: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  passwordToggleText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.blue },
  validationText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, lineHeight: 17, color: colors.pink, marginTop: -8 },
  otpInput: { letterSpacing: 4, textAlign: 'center', fontFamily: fontFamilies.dmSansMedium },
  inlineAction: { alignSelf: 'center', paddingVertical: 2 },
  inlineActionText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.blue },
  switchRow: { alignItems: 'center', marginTop: 24 },
  switchText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted },
  switchLink: { color: colors.blue, fontFamily: fontFamilies.dmSansMedium },
});
