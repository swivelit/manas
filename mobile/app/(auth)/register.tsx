import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/auth';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { Button } from '../../components/Button';
import { ConsentCheckbox } from '../../components/ConsentCheckbox';
import { exchangeGoogleIdToken, isGoogleConfigured, useGoogleAuth } from '../../lib/google';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const [, googleResponse, googlePromptAsync] = useGoogleAuth();

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.params.id_token) {
      (async () => {
        try {
          const { token, user } = await exchangeGoogleIdToken(googleResponse.params.id_token);
          await setAuth(token, user);
          router.replace('/(tabs)');
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          Alert.alert('Google sign-in failed', e?.response?.data?.error ?? 'Please try again');
        }
      })();
    }
  }, [googleResponse, setAuth]);

  async function handleGoogle() {
    if (!consent) { Alert.alert('One quick step', 'Please agree to the Terms & Privacy Policy to continue.'); return; }
    if (!isGoogleConfigured()) {
      Alert.alert('Coming soon', 'Google sign-in launches as soon as our setup is finalised.');
      return;
    }
    await googlePromptAsync();
  }

  function getErrorMessage(err: any, fallback: string) {
    const error = err?.response?.data?.error;
    return typeof error === 'string' ? error : fallback;
  }

  async function handleRequestOtp() {
    if (!name.trim() || !email.trim()) { Alert.alert('Please enter your name and email'); return; }
    if (!consent) { Alert.alert('One quick step', 'Please agree to the Terms & Privacy Policy to continue.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-email-otp', {
        name: name.trim(),
        email: email.trim(),
        mode: 'register',
      });
      const devOtp = data?.devOnly?.otp;
      if (devOtp) setOtp(devOtp);
      setOtpSent(true);
      Alert.alert('Code sent', devOtp ? `Development code: ${devOtp}` : 'Check your email for your MANAS verification code.');
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
        name: name.trim(),
        email: email.trim(),
        otp: otp.trim(),
        mode: 'register',
      });
      await setAuth(data.token, data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration failed', getErrorMessage(err, 'Please try again'));
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

          <Text style={styles.heading}>Start your{'\n'}<Text style={styles.headingItalic}>journey.</Text></Text>
          <Text style={styles.sub}>Create your account with an email verification code.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Your name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} editable={!otpSent} placeholder="Sarah Mathew" placeholderTextColor={colors.muted} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} editable={!otpSent} placeholder="sarah@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>

            {otpSent ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Verification code</Text>
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
                  <Text style={styles.inlineActionText}>Use different details</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {!otpSent && (
              <ConsentCheckbox checked={consent} onToggle={() => setConsent(c => !c)} />
            )}

            <Button
              label={loading ? 'Please wait...' : otpSent ? 'Verify and begin' : 'Send verification code'}
              onPress={otpSent ? handleVerifyOtp : handleRequestOtp}
              loading={loading}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} />
          </View>

          <View style={styles.altRow}>
            <TouchableOpacity onPress={handleGoogle} style={styles.altBtn} activeOpacity={0.85}>
              <Text style={styles.altGlyph}>G</Text>
              <Text style={styles.altText}>Sign up with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/phone')} style={styles.altBtn} activeOpacity={0.85}>
              <Text style={styles.altGlyph}>✆</Text>
              <Text style={styles.altText}>Sign up with phone</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Sign in</Text></Text>
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted },
  altRow: { marginTop: 16, gap: 10 },
  altBtn: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  altGlyph: { fontFamily: fontFamilies.frauncesMedium, fontSize: 16, color: colors.ink },
  altText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
});
