import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CacheBadge } from '@/src/components/CacheBadge';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { formatFreshness, formatPercent, formatVnd } from '@/src/lib/format';
import { getDeal } from '@/src/lib/api';

export function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dealId = Array.isArray(id) ? id[0] : id;
  const query = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => getDeal(dealId),
    enabled: Boolean(dealId),
    staleTime: 1000 * 60 * 5,
  });

  const deal = query.data;
  const showStaleBanner = Boolean(query.error && deal);

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" />
        <Text style={styles.centerText}>Loading detail</Text>
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Deal not available</Text>
        <Text style={styles.centerText}>Pull from the feed again after the backend is reachable.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
    >
      <OfflineBanner visible={showStaleBanner} />

      <View style={styles.card}>
        <View style={styles.headingRow}>
          <View style={styles.headingText}>
            <Text style={styles.title}>{deal.item.product_name}</Text>
            <Text style={styles.subtitle}>{formatFreshness(deal.updated_at || deal.created_at)}</Text>
          </View>
          <CacheBadge state={deal.cache} />
        </View>
        <Text style={[styles.verdict, verdictStyle[deal.deal.verdict]]}>{deal.deal.verdict}</Text>
      </View>

      <View style={styles.grid}>
        <Metric label="Asking price" value={formatVnd(deal.item.asking_price)} />
        <Metric label="Market price" value={formatVnd(deal.deal.market_price)} />
        <Metric label="Discount" value={formatPercent(deal.deal.discount_pct)} />
        <Metric label="Confidence" value={formatPercent((deal.item.confidence ?? 0) * 100)} />
      </View>

      <Section title="Raw post">
        <Text style={styles.bodyText}>{deal.raw_text || 'No raw post supplied by the API.'}</Text>
      </Section>

      <Section title="Normalized item">
        <Text style={styles.code}>{JSON.stringify(deal.item, null, 2)}</Text>
      </Section>

      <Section title="Processing trace">
        {(deal.trace?.length ? deal.trace : ['No trace supplied']).map((step, index) => (
          <View key={`${step}-${index}`} style={styles.traceItem}>
            <Text style={styles.traceNumber}>{index + 1}</Text>
            <Text style={styles.traceText}>{step}</Text>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  bodyText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  center: {
    alignItems: 'center',
    backgroundColor: '#f7faf9',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  code: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headingText: {
    flex: 1,
    minWidth: 0,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
    minHeight: 82,
    padding: 13,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  scroll: {
    backgroundColor: '#f7faf9',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  traceItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  traceNumber: {
    backgroundColor: '#ccfbf1',
    borderRadius: 6,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  traceText: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
  },
  verdict: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
