import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MODE_OPTIONS } from '../constants';
import type { GameMode } from '../types';

type Props = {
  value: GameMode;
  onChange: (mode: GameMode) => void;
};

export function ModeBar({ value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {MODE_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.short, selected && styles.shortSelected]}
            >
              {option.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#07070B',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E26',
    backgroundColor: '#0D0D13',
    alignItems: 'center',
  },
  tabSelected: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  label: {
    color: '#A8A8B4',
    fontSize: 13,
    fontWeight: '700',
  },
  labelSelected: {
    color: '#4ADE80',
  },
  short: {
    marginTop: 2,
    color: '#5A5A66',
    fontSize: 10,
  },
  shortSelected: {
    color: '#8B8B96',
  },
});
