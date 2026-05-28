import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useSessions } from '../../lib/queries';
import { useAuthStore } from '../../lib/auth';
import { MoodCheckIn } from '../../components/MoodCheckIn';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

export default function HomeScreen() {
  const user = useAuthStore(s => s.user);
  const { data: sessions } = useSessions();

  const upcoming = sessions?.find((s: any) => s.status === 'CONFIRMED' || s.status === 'PENDING');
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{format(new Date(), 'EEEE, d MMM').toUpperCase()}</Text>
            <Text style={styles.greet}>
              {greeting()}{'\n'}
              <Text style={styles.greetName}>{user?.name?.split(' ')[0] ?? 'Sarah'} ✿</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatar} />
        </View>

        {/* Mood check-in */}
        <MoodCheckIn onPress={() => router.push('/mood')} />

        {/* Categories */}
        <View style={styles.catsTitle}>
          <Text style={styles.catsTitleText}>Two paths forward</Text>
          <Text style={styles.catsSeeAll}>See all →</Text>
        </View>

        <View style={styles.cats}>
          <TouchableOpacity
            onPress={() => router.push('/topics/emotional-healing-list')}
            style={[styles.cat, styles.catBlue]}
            activeOpacity={0.85}
          >
            <View style={styles.catGlyph}>
              <Icon name="heart" size={20} color={colors.blueDeep} />
            </View>
            <View>
              <Text style={styles.catCount}>15 topics</Text>
              <Text style={[styles.catTitle, { color: colors.blueDeep }]}>Emotional{'\n'}Healing</Text>
              <Text style={[styles.catSub, { color: colors.blueDeep }]}>Soothe the mind</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/coaching')}
            style={[styles.cat, styles.catPink]}
            activeOpacity={0.85}
          >
            <View style={styles.catGlyph}>
              <Icon name="star" size={20} color="#B03077" />
            </View>
            <View>
              <Text style={styles.catCount}>10 topics</Text>
              <Text style={[styles.catTitle, { color: '#B03077' }]}>Coaching{'\n'}& Growth</Text>
              <Text style={[styles.catSub, { color: '#B03077' }]}>Lead with clarity</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Upcoming session */}
        {upcoming && (
          <TouchableOpacity
            style={styles.upcomingCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/sessions')}
          >
            <View>
              <Text style={styles.upcomingLabel}>UP NEXT · TOMORROW</Text>
              <Text style={styles.upcomingText}>
                Demo with{' '}
                <Text style={styles.upcomingCoach}>{upcoming.coach.user.name.replace('Dr. ', 'Dr. ')}</Text>
                {' '}· {format(new Date(upcoming.scheduledAt), 'h:mm a')}
              </Text>
            </View>
            <TouchableOpacity style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {!upcoming && (
          <TouchableOpacity
            style={styles.upcomingCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/topics')}
          >
            <View>
              <Text style={styles.upcomingLabel}>GET STARTED</Text>
              <Text style={styles.upcomingText}>Book your first <Text style={styles.upcomingCoach}>free demo</Text></Text>
            </View>
            <TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/(tabs)/topics')}>
              <Text style={styles.joinBtnText}>Book →</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 24 },
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, letterSpacing: 1 },
  greet: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink, letterSpacing: -0.3, marginTop: 2, lineHeight: 26 },
  greetName: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  avatar: { width: 38, height: 38, borderRadius: 99, backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.cream },
  catsTitle: { paddingHorizontal: 22, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  catsTitleText: { fontFamily: fontFamilies.frauncesMedium, fontSize: 16, color: colors.ink },
  catsSeeAll: { fontFamily: fontFamilies.dmSans, fontSize: 10, color: colors.muted, letterSpacing: 0.5 },
  cats: { paddingHorizontal: 22, flexDirection: 'row', gap: 10 },
  cat: { flex: 1, borderRadius: 20, padding: 14, justifyContent: 'space-between', aspectRatio: 1 / 1.05, overflow: 'hidden' },
  catBlue: { backgroundColor: '#DDE9FF' },
  catPink: { backgroundColor: '#FFE1F0' },
  catGlyph: { width: 42, height: 42, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' },
  catTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, letterSpacing: -0.3, lineHeight: 20, marginTop: 4 },
  catSub: { fontFamily: fontFamilies.dmSans, fontSize: 10, opacity: 0.7, marginTop: 2 },
  catCount: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.5, opacity: 0.6, textTransform: 'uppercase' },
  upcomingCard: { marginHorizontal: 22, marginTop: 14, backgroundColor: colors.ink, borderRadius: 18, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upcomingLabel: { fontFamily: fontFamilies.dmSans, fontSize: 9, letterSpacing: 1.8, color: '#BBB', textTransform: 'uppercase' },
  upcomingText: { fontFamily: fontFamilies.fraunces, fontSize: 13, color: colors.cream, marginTop: 3 },
  upcomingCoach: { fontFamily: fontFamilies.frauncesItalic, color: '#FFB6D9' },
  joinBtn: { backgroundColor: colors.pink, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  joinBtnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.paper },
});
