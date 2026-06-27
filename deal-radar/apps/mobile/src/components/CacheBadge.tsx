import { StyleSheet, Text, View } from 'react-native';

import type { CacheState } from '@/src/lib/types';

const LABELS: Record<CacheState, string> = {
  miss: 'MISS',
  redis_hit: 'REDIS',
  semantic_hit: 'SEMANTIC',
};

const COLORS: Record<CacheState, { background: string; text: string }> = {
  miss: { background: '#fef3c7', text: '#92400e' },
  redis_hit: { background: '#dbeafe', text: '#1d4ed8' },
  semantic_hit: { background: '#dcfce7', text: '#166534' },
};

export function CacheBadge({ state }: { state: CacheState }) {
  const color = COLORS[state] ?? COLORS.miss;

  return (
    <View style={[styles.badge, { backgroundColor: color.background }]}>
      <Text style={[styles.text, { color: color.text }]}>{LABELS[state] ?? state}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 6,
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
