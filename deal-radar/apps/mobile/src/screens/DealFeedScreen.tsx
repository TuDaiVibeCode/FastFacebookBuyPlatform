import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { DealCard } from '@/src/components/DealCard';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { VerdictFilter } from '@/src/components/VerdictFilter';
import { getDeals } from '@/src/lib/api';
import type { DealRecord, Verdict, VerdictFilter as VerdictFilterValue } from '@/src/lib/types';

function toVerdict(value: VerdictFilterValue): Verdict | undefined {
  return value === 'ALL' ? undefined : value;
}

export function DealFeedScreen() {
  const [filter, setFilter] = useState<VerdictFilterValue>('ALL');
  const verdict = useMemo(() => toVerdict(filter), [filter]);
  const query = useQuery({
    queryKey: ['deals', verdict ?? 'ALL'],
    queryFn: () => getDeals({ verdict, limit: 50 }),
    staleTime: 1000 * 30,
  });

  const hasData = Boolean(query.data?.items.length);
  const showStaleBanner = Boolean(query.error && hasData);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Deal feed</Text>
        <Text style={styles.subtitle}>Cache-first listings from the shared backend contract.</Text>
      </View>

      <VerdictFilter value={filter} onChange={setFilter} />
      <OfflineBanner visible={showStaleBanner} />

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.centerText}>Loading deals</Text>
        </View>
      ) : (
        <FlatList<DealRecord>
          contentContainerStyle={styles.list}
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor="#0f766e" />
          }
          renderItem={({ item }) => <DealCard deal={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{query.error ? 'Feed unavailable' : 'No deals yet'}</Text>
              <Text style={styles.emptyCopy}>
                {query.error
                  ? 'Start the API or pull to retry after the backend is reachable.'
                  : 'Analyze posts from the web demo or backend to populate the mobile feed.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  centerText: {
    color: '#475569',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ea',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
    padding: 20,
  },
  emptyCopy: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  header: {
    gap: 5,
  },
  list: {
    gap: 12,
    paddingBottom: 28,
    paddingTop: 12,
  },
  screen: {
    backgroundColor: '#f7faf9',
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
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
