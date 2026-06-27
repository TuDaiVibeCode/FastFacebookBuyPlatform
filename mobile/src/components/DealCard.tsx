import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CacheBadge } from '@/src/components/CacheBadge';
import { DealRecord, formatVnd } from '@/src/lib/api';

const VERDICT_TONE = {
  HOT_DEAL: { bg: '#EAF3FF', fg: '#0B57D0', icon: 'local-fire-department' },
  OK_DEAL: { bg: '#EAF3FF', fg: '#0B57D0', icon: 'thumb-up' },
  IGNORE: { bg: '#FFEBEE', fg: '#B71C1C', icon: 'block' },
} as const;

export function DealCard({ deal, onPress }: { deal: DealRecord; onPress: () => void }) {
  const tone = VERDICT_TONE[deal.deal.verdict];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.topRow}>
          <View style={[styles.verdict, { backgroundColor: tone.bg }]}>
            <MaterialIcons name={tone.icon} size={16} color={tone.fg} />
            <Text style={[styles.verdictText, { color: tone.fg }]}>{verdictLabel(deal.deal.verdict)}</Text>
          </View>
          <CacheBadge cache={deal.cache} />
        </View>

      <Text style={styles.title} numberOfLines={2}>
        {deal.item.product_name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {[deal.item.brand, deal.item.model, deal.item.condition].filter(Boolean).join(' / ') ||
          'Unstructured listing'}
      </Text>

      <View style={styles.priceGrid}>
        <View>
          <Text style={styles.priceLabel}>Ask</Text>
          <Text style={styles.price}>{formatVnd(deal.item.asking_price)}</Text>
        </View>
        <View>
          <Text style={styles.priceLabel}>Market</Text>
          <Text style={styles.price}>{formatVnd(deal.deal.market_price)}</Text>
        </View>
        <View style={styles.discountBox}>
          <Text style={styles.discount}>{deal.deal.discount_pct}%</Text>
          <Text style={styles.priceLabel}>discount</Text>
        </View>
      </View>

        <View style={styles.footer}>
          <Text style={styles.freshness}>
            {deal.freshness ?? deal.updated_at ?? 'Update time not available'}
          </Text>
          <MaterialIcons name="chevron-right" size={22} color="#64748B" />
        </View>
      </Pressable>
  );
}

function verdictLabel(verdict: keyof typeof VERDICT_TONE) {
  if (verdict === 'HOT_DEAL') return 'Good deal';
  if (verdict === 'OK_DEAL') return 'Fair deal';
  return 'Skip';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E4F5',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 1,
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 7,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
  discount: {
    color: '#0B57D0',
    fontSize: 22,
    fontWeight: '800',
  },
  discountBox: {
    alignItems: 'flex-end',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: '#D6E4F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  freshness: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    color: '#64748B',
    fontSize: 13,
  },
  price: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verdict: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
  },
  verdictText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
