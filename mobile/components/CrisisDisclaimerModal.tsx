import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelplineList } from './HelplineList';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

interface Props {
  visible: boolean;
  onAcknowledge: () => void;
}

// Shown once on first app open (gated by the `crisis_ack` flag in SecureStore).
// Mandatory safety disclaimer for a mental-health app. Tone is warm, not alarming.
export function CrisisDisclaimerModal({ visible, onAcknowledge }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>A GENTLE NOTE</Text>
          <Text style={styles.heading}>
            Before we{'\n'}<Text style={styles.headingItalic}>begin.</Text>
          </Text>

          <Text style={styles.body}>
            MANAS supports emotional wellbeing and growth, but it is not a substitute
            for emergency or crisis care.
          </Text>
          <Text style={styles.body}>
            If you are in crisis or thinking about harming yourself, please reach out
            now. You deserve immediate support — these lines are free and confidential.
          </Text>

          <Text style={styles.listLabel}>India helplines</Text>
          <HelplineList />

          <View style={styles.actions}>
            <Button label="I understand" onPress={onAcknowledge} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 24, paddingBottom: 36 },
  kicker: { fontFamily: fontFamilies.dmSans, fontSize: 10, letterSpacing: 2, color: colors.pink, textTransform: 'uppercase', marginBottom: 10 },
  heading: { fontFamily: fontFamilies.fraunces, fontSize: 34, color: colors.ink, letterSpacing: -0.5, lineHeight: 36 },
  headingItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  body: { fontFamily: fontFamilies.fraunces, fontSize: 15, color: colors.inkSoft, lineHeight: 22, marginTop: 16 },
  listLabel: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, letterSpacing: 0.5, color: colors.inkSoft, textTransform: 'uppercase', marginTop: 26, marginBottom: 12 },
  actions: { marginTop: 26, flexDirection: 'row' },
});
