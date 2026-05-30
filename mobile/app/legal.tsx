import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PRIVACY_MD, TERMS_MD } from '../lib/legal';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

type Doc = 'privacy' | 'terms';

// Renders **bold** spans inside a line.
function renderInline(text: string): React.ReactNode {
  if (!text.includes('**')) return text;
  return text.split('**').map((part, idx) =>
    idx % 2 === 1 ? <Text key={idx} style={styles.bold}>{part}</Text> : <Text key={idx}>{part}</Text>
  );
}

// Minimal markdown renderer — enough for the bundled legal docs (headings,
// bullets, italic meta line, bold spans, paragraphs). Avoids a markdown dep.
function Markdown({ source }: { source: string }) {
  return (
    <View>
      {source.split('\n').map((raw, i) => {
        const line = raw.trimEnd();
        if (line.trim() === '') return <View key={i} style={styles.gap} />;
        if (line.startsWith('### ')) return <Text key={i} style={styles.h3}>{renderInline(line.slice(4))}</Text>;
        if (line.startsWith('## ')) return <Text key={i} style={styles.h2}>{renderInline(line.slice(3))}</Text>;
        if (line.startsWith('# ')) return <Text key={i} style={styles.h1}>{renderInline(line.slice(2))}</Text>;
        if (line.startsWith('- ')) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{renderInline(line.slice(2))}</Text>
            </View>
          );
        }
        if (line.startsWith('_') && line.endsWith('_') && line.length > 2) {
          return <Text key={i} style={styles.meta}>{line.slice(1, -1)}</Text>;
        }
        return <Text key={i} style={styles.p}>{renderInline(line)}</Text>;
      })}
    </View>
  );
}

export default function LegalScreen() {
  const params = useLocalSearchParams<{ doc?: string }>();
  const initial: Doc = params.doc === 'terms' ? 'terms' : 'privacy';
  const [doc, setDoc] = useState<Doc>(initial);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headTitle}>Legal</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, doc === 'privacy' && styles.tabActive]}
          onPress={() => setDoc('privacy')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, doc === 'privacy' && styles.tabTextActive]}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, doc === 'terms' && styles.tabActive]}
          onPress={() => setDoc('terms')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, doc === 'terms' && styles.tabTextActive]}>Terms</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Markdown source={doc === 'privacy' ? PRIVACY_MD : TERMS_MD} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  head: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.ink },
  headTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 18, color: colors.ink },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 12, color: colors.inkSoft },
  tabTextActive: { color: colors.cream },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  gap: { height: 8 },
  h1: { fontFamily: fontFamilies.frauncesMedium, fontSize: 24, color: colors.ink, letterSpacing: -0.4, marginTop: 6, marginBottom: 4 },
  h2: { fontFamily: fontFamilies.frauncesMedium, fontSize: 16, color: colors.ink, marginTop: 16, marginBottom: 2 },
  h3: { fontFamily: fontFamilies.dmSansBold, fontSize: 13, color: colors.inkSoft, marginTop: 10 },
  meta: { fontFamily: fontFamilies.frauncesItalic, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  p: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.inkSoft, lineHeight: 20, marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 5, paddingRight: 6 },
  bulletDot: { fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.pink, lineHeight: 20 },
  bulletText: { flex: 1, fontFamily: fontFamilies.dmSans, fontSize: 13, color: colors.inkSoft, lineHeight: 20 },
  bold: { fontFamily: fontFamilies.dmSansBold, color: colors.ink },
});
