import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { HELPLINES } from '../lib/crisis';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

async function dial(tel: string) {
  const url = `tel:${tel}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Call', `Dial ${tel} from your phone to reach this helpline.`);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Call', `Dial ${tel} from your phone to reach this helpline.`);
  }
}

// Renders the India crisis helplines with tappable numbers. Shared by the
// first-launch CrisisDisclaimerModal and the persistent CrisisBanner.
export function HelplineList() {
  return (
    <View style={styles.wrap}>
      {HELPLINES.map((h) => (
        <View key={h.name} style={styles.card}>
          <Text style={styles.name}>{h.name}</Text>
          <Text style={styles.note}>{h.note}</Text>
          <View style={styles.numbers}>
            {h.numbers.map((n) => (
              <TouchableOpacity
                key={n.tel}
                style={styles.numberBtn}
                activeOpacity={0.85}
                onPress={() => dial(n.tel)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${h.name} at ${n.label}`}
              >
                <Text style={styles.numberGlyph}>✆</Text>
                <Text style={styles.numberText}>{n.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: { backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14 },
  name: { fontFamily: fontFamilies.frauncesMedium, fontSize: 15, color: colors.ink },
  note: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 15 },
  numbers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  numberBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.blueSoft, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14,
  },
  numberGlyph: { fontFamily: fontFamilies.frauncesMedium, fontSize: 13, color: colors.blueDeep },
  numberText: { fontFamily: fontFamilies.dmSansBold, fontSize: 13, color: colors.blueDeep, letterSpacing: 0.3 },
});
