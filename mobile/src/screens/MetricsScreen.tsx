import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getCacheMetrics, getHealth } from '@/src/lib/api';
import { sampleHealth, sampleMetrics } from '@/src/lib/sampleData';

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricTile}>
      <MaterialIcons name={icon} size={24} color="#0B57D0" />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HealthRow({ label, value }: { label: string; value: unknown }) {
  const healthy = value === true || value === 'ok' || value === 'healthy' || value === 'ready';

  return (
    <View style={styles.healthRow}>
      <View style={styles.healthName}>
        <MaterialIcons
          name={healthy ? 'check-circle' : 'info'}
          size={19}
          color={healthy ? '#0B57D0' : '#0B57D0'}
        />
        <Text style={styles.healthLabel}>{label}</Text>
      </View>
      <Text style={styles.healthValue}>{String(value ?? 'unknown')}</Text>
    </View>
  );
}

export function MetricsScreen() {
  const metricsQuery = useQuery({
    queryKey: ['metrics', 'cache'],
    queryFn: getCacheMetrics,
    placeholderData: sampleMetrics,
    staleTime: 30 * 1000,
  });

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    placeholderData: sampleHealth,
    staleTime: 30 * 1000,
  });

  const refreshing = metricsQuery.isRefetching || healthQuery.isRefetching;
  const metrics = metricsQuery.data;
  const health = healthQuery.data ?? {};
  const sampleFallbackActive = Object.values(health).some((value) => value === 'sample_fallback');
  const hitRate =
    metrics && metrics.cache_hit_rate > 1 ? metrics.cache_hit_rate : (metrics?.cache_hit_rate ?? 0) * 100;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.appBar}>
        <Text style={styles.eyebrow}>Cache system</Text>
        <Text style={styles.title}>Metrics</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              metricsQuery.refetch();
              healthQuery.refetch();
            }}
            tintColor="#0B57D0"
          />
        }>
        {sampleFallbackActive ? (
          <View style={styles.sampleBanner}>
            <MaterialIcons name="science" size={18} color="#1E3A8A" />
            <Text style={styles.sampleText}>Sample fallback active. Backend calls still run first.</Text>
          </View>
        ) : null}

        {metricsQuery.isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#0B57D0" />
            <Text style={styles.centerText}>Loading cache metrics</Text>
          </View>
        ) : metricsQuery.error || !metrics ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={24} color="#B3261E" />
            <Text style={styles.errorText}>
              {metricsQuery.error
                ? String(metricsQuery.error.message)
                : 'Cache metrics unavailable.'}
            </Text>
          </View>
        ) : (
          <View style={styles.metricGrid}>
            <MetricTile
              icon="percent"
              label="Hit rate"
              value={`${Math.round(hitRate)}%`}
            />
            <MetricTile
              icon="savings"
              label="Cost saved"
              value={`$${metrics.estimated_cost_saved.toFixed(2)}`}
            />
            <MetricTile
              icon="memory"
              label="Exact hits"
              value={String(metrics.exact_cache_hits)}
            />
            <MetricTile
              icon="hub"
              label="Semantic hits"
              value={String(metrics.semantic_cache_hits)}
            />
            <MetricTile
              icon="auto-awesome"
              label="LLM avoided"
              value={String(metrics.llm_calls_avoided)}
            />
            <MetricTile
              icon="bolt"
              label="LLM calls"
              value={String(metrics.llm_calls_made)}
            />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="health-and-safety" size={22} color="#0B57D0" />
            <Text style={styles.sectionTitle}>Service health</Text>
          </View>
          {healthQuery.isLoading ? (
            <Text style={styles.centerText}>Checking API, Redis, Chroma, and mock mode</Text>
          ) : healthQuery.error ? (
            <Text style={styles.errorText}>{String(healthQuery.error.message)}</Text>
          ) : Object.keys(health).length ? (
            Object.entries(health).map(([key, value]) => (
              <HealthRow key={key} label={key.replaceAll('_', ' ')} value={value} />
            ))
          ) : (
            <Text style={styles.centerText}>No health payload returned.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E4F5',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  centerState: {
    alignItems: 'center',
    gap: 8,
    padding: 28,
  },
  centerText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 28,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F2B8B5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  errorText: {
    color: '#B3261E',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  eyebrow: {
    color: '#0B57D0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  healthLabel: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  healthName: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 9,
  },
  healthRow: {
    alignItems: 'center',
    borderTopColor: '#D6E4F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  healthValue: {
    color: '#334155',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  metricTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E4F5',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    minHeight: 124,
    padding: 14,
    width: '48%',
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
  },
  screen: {
    backgroundColor: '#F7FAFF',
    flex: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  sampleBanner: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sampleText: {
    color: '#1E3A8A',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
