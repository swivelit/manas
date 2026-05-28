import React, { useState } from 'react';
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

export default function PhoneAuth() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  function errMsg(err: unknown, fallback: string) {
    const e = err as { response?: { status?: number; data?: { error?: string } } };
    const msg = e?.response?.data?.error;
    return typeof msg === 'string' ? msg : fallback;
  }

  async function handleRequest() {
    if (!phone.trim()) { Alert.alert('Enter your phone number'); return; }
    setLoading(true);
    try {
      await api.post('/auth/request-phone-otp', { phone: phone.trim() });
      setSent(true);
      Alert.alert('Code sent', 'Check your SMS for your MANAS verification code.');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 501) {
        Alert.alert('Coming soon', 'Phone sign-in launches as soon as our SMS provider is set up.');
      } else {
        Alert.alert('Could not send code', errMsg(err, 'Please try again'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!code.trim()) { Alert.alert('Enter the code'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-phone-otp', {
        phone: phone.trim(),
        code: code.trim(),
        name: name.trim() || undefined,
      });
      await setAuth(data.token, data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Verification failed', errMsg(err, 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Use your{'\n'}<Text style={styles.headingItalic}>phone.</Text></Text>
          <Text style={styles.sub}>We will text you a one-time code. Include your country code.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                editable={!sent}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
              />
            </View>

            {!sent && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Your name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Sarah Mathew"
                  placeholderTextColor={colors.muted}
                />
              </View>
            )}

            {sent && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SMS code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                />
              </View>
            )}

            <Button
              label={loading ? 'Please wait…' : sent ? 'Verify and continue' : 'Text me a code'}
              onPress={sent ? handleVerify : handleRequest}
              loading={loading}
            />

            {sent && (
              <TouchableOpacity onPress={() => { setSent(false); setCode(''); }} style={styles.inlineAction}>
                <Text style={styles.inlineActionText}>Use a different number</Text>
              </TouchableOpacity>
            )}
          </View>
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
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 13,
    fontFamily: fontFamilies.dmSans, fontSize: 14, color: colors.ink,
  },
  codeInput: { letterSpacing: 4, textAlign: 'center', fontFamily: fontFamilies.dmSansMedium },
  inlineAction: { alignSelf: 'center', paddingVertical: 2 },
  inlineActionText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.blue },
});
