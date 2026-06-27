import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CacheBadge } from '@/src/components/CacheBadge';
import { formatFreshness, formatPercent, formatVnd } from '@/src/lib/format';
import type { DealRecord } from '@/src/lib/types';

export function DealCard({ deal }: { deal: DealRecord }) {
  return (
    <Link href={{ pathname: '/deals/[id]', params: { id: deal.id } }} asChild>
      <Pressable style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={styles.product}>
              {deal.item.product_name}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {deal.item.brand || 'Unknown brand'} {deal.item.model ? `- ${deal.item.model}` : ''}
            </Text>
          </View>
          <CacheBadge state={deal.cache} />
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Ask</Text>
            <Text style={styles.metricValue}>{formatVnd(deal.item.asking_price)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Market</Text>
            <Text style={styles.metricValue}>{formatVnd(deal.deal.market_price)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Discount</Text>
            <Text style={styles.metricValue}>{formatPercent(deal.deal.discount_pct)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.verdict, verdictStyle[deal.deal.verdict]]}>{deal.deal.verdict}</Text>
          <Text style={styles.freshness}>{deal.freshness || formatFreshness(deal.updated_at || deal.created_at)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const verdictStyle = StyleSheet.create({
  HOT_DEAL: {
    color: '#b91c1c',
  },
  IGNORE: {
    color: '#64748b',
  },
  OK_DEAL: {
    color: '#0f766e',
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  freshness: {
    color: '#64748b',
    fontSize: 12,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  meta: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 3,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metrics: {
    flexDirection: 'row',
    gap: 10,
  },
  metricValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  product: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  verdict: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
