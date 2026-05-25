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

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  async function handleRegister() {
    if (!name || !email || !password) { Alert.alert('Please fill in all fields'); return; }
    if (password.length < 8) { Alert.alert('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      await setAuth(data.token, data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration failed', err?.response?.data?.error ?? 'Please try again');
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

          <Text style={styles.heading}>Start your{'\n'}<Text style={styles.headingItalic}>journey.</Text></Text>
          <Text style={styles.sub}>Create your free account to begin.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Your name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Sarah Mathew" placeholderTextColor={colors.muted} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="sarah@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min. 8 characters" placeholderTextColor={colors.muted} secureTextEntry />
            </View>
            <Button label={loading ? 'Creating account…' : 'Begin →'} onPress={handleRegister} loading={loading} />
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
  switchRow: { alignItems: 'center', marginTop: 24 },
  switchText: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted },
  switchLink: { color: colors.blue, fontFamily: fontFamilies.dmSansMedium },
});
