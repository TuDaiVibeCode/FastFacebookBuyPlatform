import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CacheBadge } from '@/src/components/CacheBadge';
import { formatVnd, getDeal } from '@/src/lib/api';
import { getSampleDeal } from '@/src/lib/sampleData';

const VERDICT_TONE = {
  HOT_DEAL: { bg: '#EAF3FF', fg: '#0B57D0', icon: 'local-fire-department' },
  OK_DEAL: { bg: '#EAF3FF', fg: '#0B57D0', icon: 'thumb-up' },
  IGNORE: { bg: '#FFEBEE', fg: '#B71C1C', icon: 'block' },
} as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function DealDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id ?? '');
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const dealQuery = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDeal(id),
    placeholderData: () => {
      if (!id) {
        return undefined;
      }

      try {
        return getSampleDeal(id);
      } catch {
        return undefined;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(id),
  });

  const deal = dealQuery.data;
  const tone = deal ? VERDICT_TONE[deal.deal.verdict] : VERDICT_TONE.OK_DEAL;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.appBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View style={styles.appBarTitle}>
          <Text style={styles.eyebrow}>Deal detail</Text>
          <Text style={styles.title} numberOfLines={1}>
            {deal?.item.product_name ?? 'Loading listing'}
          </Text>
        </View>
      </View>

      {dealQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#0B57D0" />
          <Text style={styles.centerText}>Loading deal</Text>
        </View>
      ) : dealQuery.error || !deal ? (
        <View style={styles.centerState}>
          <MaterialIcons name="error-outline" size={34} color="#B3261E" />
          <Text style={styles.centerTitle}>Deal unavailable</Text>
          <Text style={styles.centerText}>
            {dealQuery.error ? String(dealQuery.error.message) : 'Deal details are not available right now.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={dealQuery.isRefetching}
              onRefresh={() => dealQuery.refetch()}
              tintColor="#0B57D0"
            />
          }
          contentContainerStyle={styles.content}>
          {isOffline && deal ? (
            <View style={styles.stateBanner}>
              <MaterialIcons name="cloud-off" size={18} color="#0842A0" />
              <Text style={styles.stateBannerText}>Offline. Showing latest saved detail.</Text>
            </View>
          ) : null}

          {deal.source === 'sample_fallback' ? (
            <View style={styles.sampleBanner}>
              <MaterialIcons name="science" size={18} color="#1E3A8A" />
              <Text style={styles.sampleText}>Using sample data while loading live details.</Text>
            </View>
          ) : null}

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={[styles.verdictPill, { backgroundColor: tone.bg }]}>
                <MaterialIcons name={tone.icon} size={18} color={tone.fg} />
                <Text style={[styles.verdictText, { color: tone.fg }]}>{verdictLabel(deal.deal.verdict)}</Text>
              </View>
              <CacheBadge cache={deal.cache} />
            </View>
            <Text style={styles.product}>{deal.item.product_name}</Text>
            <View style={styles.discountRow}>
              <Text style={styles.discount}>{deal.deal.discount_pct}%</Text>
              <Text style={styles.discountLabel}>below market</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Price check</Text>
            <Row label="Asking price" value={formatVnd(deal.item.asking_price)} />
            <Row label="Market price" value={formatVnd(deal.deal.market_price)} />
            <Row label="Discount" value={`${deal.deal.discount_pct}%`} />
            <Row
              label="Difference"
              value={`${formatVnd(deal.deal.market_price)} - ${formatVnd(deal.item.asking_price)}`}
            />
            <Row label="Data from" value={friendlySource(deal.source)} />
            <Row label="Freshness" value={deal.freshness ?? deal.updated_at ?? 'n/a'} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product info</Text>
            <Row label="Brand" value={deal.item.brand ?? 'n/a'} />
            <Row label="Model" value={deal.item.model ?? 'n/a'} />
            <Row label="Condition" value={deal.item.condition ?? 'n/a'} />
            <Row label="Sold" value={deal.item.sold_status ? 'Yes' : 'No'} />
            <Row
              label="Confidence"
              value={
                typeof deal.item.confidence === 'number'
                  ? `${Math.round(deal.item.confidence * 100)}%`
                  : 'n/a'
              }
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Listing text</Text>
            <Text style={styles.rawText}>{deal.raw_post ?? 'No listing text available.'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>How checked</Text>
            {(deal.trace ?? []).length ? (
              deal.trace?.map((step, index) => (
                <View style={styles.traceRow} key={`${step}-${index}`}>
                  <View style={styles.traceDot} />
                  <Text style={styles.traceText}>{humanizeTraceStep(step)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.rawText}>Check steps not available.</Text>
            )}
          </View>
        </ScrollView>
      )}
  </SafeAreaView>
  );
}

function verdictLabel(verdict: keyof typeof VERDICT_TONE) {
  if (verdict === 'HOT_DEAL') return 'Good deal';
  if (verdict === 'OK_DEAL') return 'Fair deal';
  return 'Skip';
}

function friendlySource(source?: string) {
  if (source === 'sample_fallback') {
    return 'Sample data';
  }
  return source || 'Live data';
}

function humanizeTraceStep(step: string) {
  const map: Record<string, string> = {
    redis_miss: 'No quick match',
    semantic_miss: 'No similar saved item',
    mock_llm: 'Quick AI check',
    scored: 'Price score calculated',
    stored: 'Saved for reuse',
    reused_prior_analysis: 'Used earlier result',
    redis_hit: 'Used saved result',
    semantic_hit: 'Used similar item',
    returned_cached_response: 'Loaded from saved result',
    recomputed_score: 'Price rechecked',
  };
  return map[step] ?? step.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  appBarTitle: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E4F5',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
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
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  discount: {
    color: '#0B57D0',
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
  },
  discountLabel: {
    color: '#0842A0',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
  },
  discountRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  eyebrow: {
    color: '#0B57D0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: '#EAF3FF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  product: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  rawText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  rowValue: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  screen: {
    backgroundColor: '#F7FAFF',
    flex: 1,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  traceDot: {
    backgroundColor: '#0B57D0',
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  traceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  traceText: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  verdictPill: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    height: 32,
    paddingHorizontal: 11,
  },
  verdictText: {
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sampleText: {
    color: '#1E3A8A',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  stateBanner: {
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
  stateBannerText: {
    color: '#0842A0',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
