import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminCoaches, useAdminUsers, usePromoteCoach } from '../../lib/queries';
import { Button } from '../../components/Button';
import { useDialog } from '../../components/AppDialog';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

type Coach = { id: string; specialty: string; user: { id: string; name: string; email: string; isActive: boolean } };
type AdminUser = { id: string; name: string; email: string; role: string };

export default function AdminCoaches() {
  const dialog = useDialog();
  const { data: coachesData, isLoading } = useAdminCoaches();
  const { data: usersData } = useAdminUsers();
  const promote = usePromoteCoach();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');

  const coaches: Coach[] = Array.isArray(coachesData) ? coachesData : [];
  const allUsers: AdminUser[] = Array.isArray(usersData?.items) ? usersData.items : [];
  // Candidates: users who aren't ADMIN and don't already have a coach profile.
  const coachUserIds = new Set(coaches.map(c => c.user.id));
  const candidates = allUsers.filter(u => u.role !== 'ADMIN' && !coachUserIds.has(u.id));
  const picked = candidates.find(u => u.id === userId) ?? null;

  async function doPromote() {
    if (!userId) { void dialog.alert('Pick a user', 'Select the user to promote.'); return; }
    try {
      await promote.mutateAsync({ userId, specialty: specialty.trim() || undefined });
      void dialog.alert('Done', `${picked?.name ?? 'User'} is now a coach.`);
      setPickerOpen(false); setUserId(null); setSpecialty('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const msg = typeof e?.response?.data?.error === 'string' ? e.response!.data!.error as string : 'Please try again.';
      void dialog.alert('Could not promote', msg);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>PRACTITIONERS</Text>
          <Text style={styles.title}>Coaches</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Promote</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.help}>No coaches yet. Promote a user to get started.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.user.name}</Text>
                <Text style={styles.sub}>{item.specialty} · {item.user.email}</Text>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Promote a user to coach</Text>
            <Text style={styles.fieldLabel}>Select a user</Text>
            <ScrollView style={styles.pickList} keyboardShouldPersistTaps="handled">
              {candidates.length === 0 ? (
                <Text style={styles.help}>No eligible users to promote.</Text>
              ) : candidates.map(u => (
                <TouchableOpacity key={u.id} style={[styles.pickRow, userId === u.id && styles.pickRowActive]} onPress={() => setUserId(u.id)} activeOpacity={0.85}>
                  <Text style={[styles.pickName, userId === u.id && styles.pickNameActive]}>{u.name}</Text>
                  <Text style={[styles.pickEmail, userId === u.id && styles.pickNameActive]}>{u.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Specialty (optional)</Text>
            <TextInput style={styles.input} value={specialty} onChangeText={setSpecialty} placeholder="e.g. Clinical Psychology" placeholderTextColor={colors.muted} />

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.cancelBtn} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button label={promote.isPending ? 'Promoting…' : 'Promote'} onPress={doPromote} loading={promote.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  addBtn: { backgroundColor: colors.ink, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  row: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  name: { fontFamily: fontFamilies.frauncesMedium, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 2 },
  help: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,28,46,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34, maxHeight: '82%' },
  handle: { width: 40, height: 4, borderRadius: 99, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 19, color: colors.ink },
  fieldLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  pickList: { maxHeight: 220 },
  pickRow: { backgroundColor: colors.paper, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 8 },
  pickRowActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  pickName: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
  pickNameActive: { color: colors.cream },
  pickEmail: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 1 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, fontFamily: fontFamilies.dmSans, fontSize: 14, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'center' },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  cancelText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
});
