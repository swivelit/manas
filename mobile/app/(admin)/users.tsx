import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Switch, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminUsers, useUpdateAdminUser } from '../../lib/queries';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

type AdminUser = {
  id: string; email: string; name: string; role: string;
  isPremium: boolean; isActive: boolean; createdAt: string;
};

const ROLES = ['USER', 'COACH', 'ADMIN'] as const;
const roleTint: Record<string, string> = { USER: colors.blueSoft, COACH: colors.sageSoft, ADMIN: colors.pinkSoft };

export default function AdminUsers() {
  const { data, isLoading, isError } = useAdminUsers(1, 100);
  const update = useUpdateAdminUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emailQuery, setEmailQuery] = useState('');

  const users: AdminUser[] = Array.isArray(data?.items) ? data.items : [];
  const filteredUsers = emailQuery.trim()
    ? users.filter(u => u.email.toLowerCase().includes(emailQuery.trim().toLowerCase()))
    : users;
  const current = users.find(u => u.id === selectedId) ?? null;

  function change(id: string, patch: { role?: string; isPremium?: boolean; isActive?: boolean }) {
    update.mutate({ id, ...patch }, { onError: () => Alert.alert('Could not update', 'Please try again.') });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <Text style={styles.kicker}>MANAGE</Text>
        <Text style={styles.title}>Users{data?.total ? ` · ${data.total}` : ''}</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={emailQuery}
          onChangeText={setEmailQuery}
          placeholder="Search by email"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Couldn't load users</Text></View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No matching users</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => setSelectedId(item.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name} {!item.isActive && <Text style={styles.inactive}>· INACTIVE</Text>}</Text>
                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
              </View>
              {item.isPremium && <View style={styles.premiumDot}><Text style={styles.premiumDotText}>★</Text></View>}
              <View style={[styles.badge, { backgroundColor: roleTint[item.role] ?? colors.creamDeep }]}>
                <Text style={styles.badgeText}>{item.role}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!current} transparent animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {current && (
              <>
                <Text style={styles.sheetName}>{current.name}</Text>
                <Text style={styles.sheetEmail}>{current.email}</Text>

                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.chips}>
                  {ROLES.map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, current.role === r && styles.chipActive]}
                      onPress={() => change(current.id, { role: r })}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, current.role === r && styles.chipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>Setting COACH here changes the role only. Use the Coaches tab to create a full coach profile.</Text>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Premium</Text>
                  <Switch value={current.isPremium} onValueChange={(v) => change(current.id, { isPremium: v })} trackColor={{ true: colors.pink, false: colors.line }} thumbColor={colors.paper} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Switch value={current.isActive} onValueChange={(v) => change(current.id, { isActive: v })} trackColor={{ true: colors.sage, false: colors.line }} thumbColor={colors.paper} />
                </View>

                <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.closeBtn} activeOpacity={0.85}>
                  <Text style={styles.closeText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10 },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  searchWrap: { paddingHorizontal: 22, paddingBottom: 10 },
  searchInput: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.ink },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  row: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  name: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
  inactive: { fontFamily: fontFamilies.dmSansBold, fontSize: 8, color: colors.pink },
  email: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 1 },
  premiumDot: { width: 22, height: 22, borderRadius: 99, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  premiumDotText: { fontSize: 11, color: colors.pink },
  badge: { borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontFamily: fontFamilies.dmSansBold, fontSize: 9, color: colors.ink, letterSpacing: 0.5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,28,46,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
  handle: { width: 40, height: 4, borderRadius: 99, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
  sheetName: { fontFamily: fontFamilies.frauncesMedium, fontSize: 20, color: colors.ink },
  sheetEmail: { fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.muted, marginTop: 2 },
  fieldLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.inkSoft },
  chipTextActive: { color: colors.cream },
  hint: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, marginTop: 8, lineHeight: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.paper, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 10 },
  toggleLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 14, color: colors.ink },
  closeBtn: { marginTop: 18, alignSelf: 'center', paddingVertical: 11, paddingHorizontal: 32, borderRadius: 99, backgroundColor: colors.ink },
  closeText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
});
