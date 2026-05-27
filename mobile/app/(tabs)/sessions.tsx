import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSessions } from '../../lib/queries';
import { SessionCard } from '../../components/SessionCard';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

const accentColors = [colors.ink, colors.blue, colors.purple];

export default function SessionsScreen() {
  const { data: sessions, isLoading } = useSessions();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <Text style={styles.title}>Your{'\n'}<Text style={styles.titleItalic}>sessions.</Text></Text>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push('/(tabs)/topics')}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : sessions?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySub}>Book your first free demo to get started</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/topics')} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Explore topics →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s: any) => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <SessionCard
              session={item}
              accentColor={accentColors[index % accentColors.length]}
              onPress={() => router.push(`/session/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 28, color: colors.ink, letterSpacing: -0.5, lineHeight: 30 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  bookBtn: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, marginTop: 4 },
  bookBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.cream },
  list: { paddingHorizontal: 22, paddingBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 20, color: colors.ink },
  emptySub: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' },
  emptyBtn: { marginTop: 20, backgroundColor: colors.ink, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
});
