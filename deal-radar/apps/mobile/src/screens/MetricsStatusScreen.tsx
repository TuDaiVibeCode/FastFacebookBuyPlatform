import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OfflineBanner } from '@/src/components/OfflineBanner';
import { API_BASE_URL, getCacheMetrics, getHealth } from '@/src/lib/api';

function numberValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'ok' : 'down';
  }
  return 'n/a';
}

export function MetricsStatusScreen() {
  const metrics = useQuery({
    queryKey: ['metrics', 'cache'],
    queryFn: getCacheMetrics,
    staleTime: 1000 * 30,
  });
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    staleTime: 1000 * 30,
  });

  const refreshing = metrics.isRefetching || health.isRefetching;
  const hasCachedData = Boolean(metrics.data || health.data);
  const showStaleBanner = Boolean((metrics.error || health.error) && hasCachedData);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            metrics.refetch();
            health.refetch();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cache metrics</Text>
        <Text style={styles.subtitle}>Backend: {API_BASE_URL}</Text>
      </View>

      <OfflineBanner visible={showStaleBanner} />

      <View style={styles.grid}>
        <Metric label="Exact hits" value={numberValue(metrics.data?.exact_cache_hits ?? metrics.data?.redis_hits)} />
        <Metric
          label="Semantic hits"
          value={numberValue(metrics.data?.semantic_cache_hits ?? metrics.data?.semantic_hits)}
        />
        <Metric label="LLM avoided" value={numberValue(metrics.data?.llm_calls_avoided)} />
        <Metric label="LLM calls" value={numberValue(metrics.data?.llm_calls_made)} />
        <Metric label="Hit rate" value={numberValue(metrics.data?.cache_hit_rate)} />
        <Metric label="Cost saved" value={numberValue(metrics.data?.estimated_cost_saved)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service health</Text>
        {health.data ? (
          Object.entries(health.data).map(([key, value]) => (
            <View key={key} style={styles.healthRow}>
              <Text style={styles.healthKey}>{key}</Text>
              <Text style={styles.healthValue}>{numberValue(value)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyCopy}>Health status is unavailable until the API responds.</Text>
        )}
      </View>
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

const styles = StyleSheet.create({
  emptyCopy: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  header: {
    gap: 5,
  },
  healthKey: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  healthRow: {
    alignItems: 'center',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  healthValue: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '900',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
    minHeight: 86,
    padding: 13,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  scroll: {
    backgroundColor: '#f7faf9',
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: '#111827',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
