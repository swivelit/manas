import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelplineList } from './HelplineList';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

interface Props {
  // 'header' is a compact inline link; 'footer' is a full-width gentle row.
  variant?: 'header' | 'footer';
  style?: ViewStyle;
}

// Persistent "In crisis? Tap for help" entry point. Opens the same India
// helplines surfaced in the first-launch disclaimer. Used on Sessions + Profile.
export function CrisisBanner({ variant = 'footer', style }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="In crisis? Tap for help"
        style={[variant === 'header' ? styles.header : styles.footer, style]}
      >
        <Text style={styles.glyph}>♥</Text>
        <Text style={variant === 'header' ? styles.headerText : styles.footerText}>
          In crisis? Tap for help
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>You're not alone.</Text>
              <Text style={styles.sheetBody}>
                MANAS is not a crisis service. If you need urgent support, these India
                helplines are free, confidential, and available now.
              </Text>
              <HelplineList />
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn} activeOpacity={0.85}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.pinkSoft, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.pinkSoft, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16 },
  glyph: { fontFamily: fontFamilies.frauncesMedium, fontSize: 13, color: colors.pink },
  headerText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.ink },
  footerText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,28,46,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '86%' },
  handle: { width: 40, height: 4, borderRadius: 99, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetScroll: { padding: 22, paddingBottom: 16 },
  sheetTitle: { fontFamily: fontFamilies.frauncesMedium, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  sheetBody: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  closeBtn: { marginTop: 18, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  closeText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
});
