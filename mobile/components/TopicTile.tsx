import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { Icon } from './Icon';

const bgCycle = [colors.blueSoft, colors.pinkSoft, colors.sageSoft, colors.peachSoft, '#E8DEF4'];
const strokeCycle = [colors.blue, '#B03077', '#5A8A52', '#C47A3C', '#6C4AB6'];

interface TopicTileProps {
  topic: { slug: string; name: string; iconName: string };
  index: number;
  onPress: () => void;
}

export function TopicTile({ topic, index, onPress }: TopicTileProps) {
  const bg = bgCycle[index % bgCycle.length];
  const stroke = strokeCycle[index % strokeCycle.length];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tile}>
      <View style={[styles.ico, { backgroundColor: bg }]}>
        <Icon name={topic.iconName} size={18} color={stroke} />
      </View>
      <Text style={styles.label} numberOfLines={2}>{topic.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ico: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 9,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 12,
  },
});
