import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

type Variant = 'primary' | 'ghost' | 'pill-dark' | 'pill-light' | 'pink';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
}

function getContainerStyle(variant: Variant) {
  switch (variant) {
    case 'ghost': return styles.ghost;
    case 'pill-dark': return styles.pillDark;
    case 'pill-light': return styles.pillLight;
    case 'pink': return styles.pink;
    default: return styles.primary;
  }
}

function getLabelStyle(variant: Variant) {
  switch (variant) {
    case 'ghost': return styles.labelGhost;
    case 'pill-dark': return styles.labelPillDark;
    case 'pill-light': return styles.labelPillLight;
    case 'pink': return styles.labelPink;
    default: return styles.labelPrimary;
  }
}

export function Button({ label, onPress, variant = 'primary', loading, style }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[styles.base, getContainerStyle(variant), style]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'ghost' ? colors.ink : colors.cream} />
        : <Text style={getLabelStyle(variant)}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 20 },
  primary: { backgroundColor: colors.ink, flex: 1 },
  ghost: { backgroundColor: 'transparent', flex: 1, borderWidth: 1, borderColor: '#D8D2C3' },
  pillDark: { backgroundColor: colors.ink, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 10 },
  pillLight: { backgroundColor: colors.cream, borderRadius: 99, borderWidth: 1, borderColor: colors.line, paddingVertical: 6, paddingHorizontal: 10 },
  pink: { backgroundColor: colors.pink, flex: 1, borderRadius: 16 },
  labelPrimary: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
  labelGhost: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.ink },
  labelPillDark: { fontFamily: fontFamilies.dmSansMedium, fontSize: 10, color: colors.cream },
  labelPillLight: { fontFamily: fontFamilies.dmSansMedium, fontSize: 10, color: colors.ink },
  labelPink: { fontFamily: fontFamilies.dmSansMedium, fontSize: 11, color: colors.paper },
});
