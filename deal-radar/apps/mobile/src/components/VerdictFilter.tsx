import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VerdictFilter as VerdictFilterValue } from '@/src/lib/types';

const OPTIONS: VerdictFilterValue[] = ['ALL', 'HOT_DEAL', 'OK_DEAL', 'IGNORE'];

export function VerdictFilter({
  value,
  onChange,
}: {
  value: VerdictFilterValue;
  onChange: (value: VerdictFilterValue) => void;
}) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.replace('_', ' ')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  optionSelected: {
    backgroundColor: '#0f766e',
  },
  optionText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  wrap: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
});
