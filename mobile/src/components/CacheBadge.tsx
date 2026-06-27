import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { CacheState } from '@/src/lib/api';

const BADGE_COPY: Record<CacheState, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  miss: { label: 'New check', icon: 'bolt' },
  redis_hit: { label: 'Quick match', icon: 'memory' },
  semantic_hit: { label: 'Smart match', icon: 'hub' },
};

const BADGE_COLORS: Record<CacheState, { bg: string; fg: string; border: string }> = {
  miss: { bg: '#F7FAFF', fg: '#0842A0', border: '#A8C7FA' },
  redis_hit: { bg: '#EAF3FF', fg: '#0B57D0', border: '#A8C7FA' },
  semantic_hit: { bg: '#D3E3FD', fg: '#0B57D0', border: '#A8C7FA' },
};

export function CacheBadge({ cache }: { cache: CacheState }) {
  const copy = BADGE_COPY[cache];
  const colors = BADGE_COLORS[cache];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <MaterialIcons name={copy.icon} size={14} color={colors.fg} />
      <Text style={[styles.label, { color: colors.fg }]}>{copy.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
