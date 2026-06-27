import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DealCard } from '@/src/components/DealCard';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { DealVerdict, getDeals } from '@/src/lib/api';
import { getSampleDeals } from '@/src/lib/sampleData';

type FilterValue = DealVerdict | 'ALL';

const FILTERS: FilterValue[] = ['ALL', 'HOT_DEAL', 'OK_DEAL', 'IGNORE'];

function getFreshnessLabel(updatedAt: number) {
  if (!updatedAt) {
    return 'No listings loaded yet';
  }

  const ageSeconds = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));

  if (ageSeconds < 60) {
    return `Updated ${ageSeconds}s ago`;
  }

  const ageMinutes = Math.round(ageSeconds / 60);
  return `Updated ${ageMinutes}m ago`;
}

export function DealFeedScreen() {
  const router = useRouter();
  const [verdict, setVerdict] = useState<FilterValue>('ALL');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const dealsQuery = useInfiniteQuery({
    queryKey: ['deals', { verdict, q: submittedSearch }],
    queryFn: ({ pageParam }) =>
      getDeals({ verdict, q: submittedSearch, limit: 4, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    placeholderData: {
      pages: [getSampleDeals({ verdict, q: submittedSearch, limit: 4 })],
      pageParams: [undefined],
    },
    staleTime: 30 * 1000,
  });

  const deals = dealsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const usesSampleFallback = deals.some((deal) => deal.source === 'sample_fallback');
  const freshnessLabel = useMemo(
    () => getFreshnessLabel(dealsQuery.dataUpdatedAt),
    [dealsQuery.dataUpdatedAt]
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.appBar}>
        <View>
          <Text style={styles.eyebrow}>Deal Radar</Text>
          <Text style={styles.title}>Deals</Text>
        </View>
        <View style={styles.statusPill}>
          <MaterialIcons name={isOffline ? 'cloud-off' : 'cloud-done'} size={17} color="#0842A0" />
          <Text style={styles.statusText}>{isOffline ? 'Offline' : 'Live'}</Text>
        </View>
      </View>

      <OfflineBanner visible={isOffline && deals.length > 0} />

      {usesSampleFallback ? (
        <View style={styles.sampleBanner}>
          <MaterialIcons name="science" size={18} color="#1E3A8A" />
          <Text style={styles.sampleText}>Showing sample listings while live data is refreshing.</Text>
        </View>
      ) : null}

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={22} color="#64748B" />
        <TextInput
          returnKeyType="search"
          placeholder="Search product or brand"
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setSubmittedSearch(search.trim())}
          style={styles.searchInput}
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSearch('');
              setSubmittedSearch('');
            }}
            hitSlop={10}>
            <MaterialIcons name="close" size={20} color="#64748B" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filtersContent}
        showsHorizontalScrollIndicator={false}
        style={styles.filters}>
        {FILTERS.map((filter) => {
          const selected = verdict === filter;
          return (
            <Pressable
              accessibilityRole="button"
              key={filter}
              onPress={() => setVerdict(filter)}
              style={[styles.filterChip, selected && styles.filterChipSelected]}>
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {filterLabel(filter)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.feedMeta}>
        <Text style={styles.feedCount}>{deals.length} listings</Text>
        <Text style={styles.freshness}>{freshnessLabel}</Text>
      </View>

      {dealsQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#0B57D0" />
          <Text style={styles.centerText}>Loading deals</Text>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={deals.length ? styles.list : styles.emptyList}
          refreshControl={
            <RefreshControl
              refreshing={dealsQuery.isRefetching && !dealsQuery.isFetchingNextPage}
              onRefresh={() => dealsQuery.refetch()}
              tintColor="#0B57D0"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <MaterialIcons name="radar" size={34} color="#64748B" />
              <Text style={styles.centerTitle}>No deals loaded</Text>
              <Text style={styles.centerText}>
                {dealsQuery.error
                  ? String(dealsQuery.error.message)
                  : 'Pull down to load latest deals.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DealCard deal={item} onPress={() => router.push(`/deals/${item.id}`)} />
          )}
          ListFooterComponent={
            deals.length && dealsQuery.hasNextPage ? (
              <Pressable
                accessibilityRole="button"
                disabled={dealsQuery.isFetchingNextPage}
                onPress={() => dealsQuery.fetchNextPage()}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  pressed && styles.loadMoreButtonPressed,
                  dealsQuery.isFetchingNextPage && styles.loadMoreButtonDisabled,
                ]}>
                {dealsQuery.isFetchingNextPage ? (
                  <ActivityIndicator color="#0B57D0" />
                ) : (
                  <>
                    <MaterialIcons name="expand-more" size={20} color="#0B57D0" />
                    <Text style={styles.loadMoreText}>Load more</Text>
                  </>
                )}
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function filterLabel(filter: FilterValue) {
  if (filter === 'HOT_DEAL') return 'Good deals';
  if (filter === 'OK_DEAL') return 'Fair deals';
  if (filter === 'IGNORE') return 'Skip';
  return 'All';
}

const styles = StyleSheet.create({
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centerState: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    padding: 28,
  },
  centerText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  centerTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#0B57D0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  feedCount: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  feedMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  filterChipSelected: {
    backgroundColor: '#D3E3FD',
    borderColor: '#0B57D0',
  },
  filterText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextSelected: {
    color: '#0842A0',
  },
  filters: {
    maxHeight: 48,
    paddingTop: 12,
  },
  filtersContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  freshness: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 18,
  },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#64748B',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    marginTop: 10,
    minWidth: 150,
    paddingHorizontal: 16,
  },
  loadMoreButtonDisabled: {
    opacity: 0.7,
  },
  loadMoreButtonPressed: {
    opacity: 0.75,
  },
  loadMoreText: {
    color: '#0B57D0',
    fontSize: 14,
    fontWeight: '900',
  },
  sampleBanner: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sampleText: {
    color: '#1E3A8A',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: '#F7FAFF',
    flex: 1,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#D6E4F5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    marginHorizontal: 16,
    marginTop: 18,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 16,
    height: 52,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    paddingHorizontal: 11,
  },
  statusText: {
    color: '#0842A0',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
});
