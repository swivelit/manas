import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

interface Props {
  checked: boolean;
  onToggle: () => void;
}

// Mandatory signup consent. Blocks account creation until checked, links to the
// in-app legal screen, and states the not-a-crisis-service acknowledgement.
export function ConsentCheckbox({ checked, onToggle }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={[styles.box, checked && styles.boxChecked]}
      >
        {checked && <Icon name="check" size={13} color={colors.paper} strokeWidth={3} />}
      </TouchableOpacity>
      <Text style={styles.label}>
        I agree to the{' '}
        <Text style={styles.link} onPress={() => router.push('/legal')}>
          Terms of Service and Privacy Policy
        </Text>
        , and understand MANAS is not a crisis service.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  box: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.muted,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: colors.paper,
  },
  boxChecked: { backgroundColor: colors.pink, borderColor: colors.pink },
  label: { flex: 1, fontFamily: fontFamilies.dmSans, fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  link: { fontFamily: fontFamilies.dmSansMedium, color: colors.blue },
});
