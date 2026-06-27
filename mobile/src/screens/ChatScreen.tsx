import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AnalyzeRequest,
  DealRecord,
  analyzeDeal,
  formatVnd,
  getDeals,
} from '@/src/lib/api';
import { getSampleDeals } from '@/src/lib/sampleData';

type ChatRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  productIds?: string[];
  analysis?: DealRecord;
  isLoading?: boolean;
};

const PROMPTS = [
  'Find best deals',
  'Best iPhone deal',
  'How checks work',
  'Show products under 10m',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Ask for a resale check, price comparison, or best deal.',
  },
];

function findMatchingDeals(input: string, catalog: DealRecord[]) {
  const normalized = input.toLowerCase();
  const wantsHot = normalized.includes('hot') || normalized.includes('best');
  const wantsCheap = normalized.includes('under') || normalized.includes('cheap') || normalized.includes('10m');
  const wantsIphone = normalized.includes('iphone') || normalized.includes('apple');

  return catalog
    .filter((deal) => {
      if (wantsHot && deal.deal.verdict !== 'HOT_DEAL') {
        return false;
      }

      const askingPrice = deal.item.asking_price ?? 0;

      if (wantsCheap && askingPrice > 10000000) {
        return false;
      }

      if (wantsIphone) {
        return [deal.item.product_name, deal.item.brand, deal.item.model]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes('iphone') || value?.toLowerCase().includes('apple'));
      }

      return [deal.item.product_name, deal.item.brand, deal.item.model, deal.raw_post]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    })
    .slice(0, 3);
}

function buildLocalAssistantReply(input: string, catalog: DealRecord[]): ChatMessage {
  const normalized = input.toLowerCase();
  const fallbackProductIds = catalog.slice(0, 3).map((deal) => deal.id);

  if (!catalog.length) {
    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text: 'Catalog is loading. Pull down on Deals to refresh.',
    };
  }

  if (normalized.includes('cache') || normalized.includes('redis') || normalized.includes('semantic')) {
    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text:
        'We check saved results first, then close matches, then run AI only if needed.',
      productIds: fallbackProductIds,
    };
  }

  const matches = findMatchingDeals(input, catalog);

  if (matches.length) {
    const best = matches[0];

    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text: `${best.item.product_name} is strongest match: ${formatVnd(
        best.item.asking_price
      )} ask vs ${formatVnd(best.deal.market_price)} market, ${
        best.deal.discount_pct === null || best.deal.discount_pct === undefined
          ? 'n/a'
          : `${best.deal.discount_pct}%`
      } discount, ${verdictLabel(best.deal.verdict)}.`,
      productIds: matches.map((deal) => deal.id),
    };
  }

  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    text:
      'No exact match found. Try "best deals", "iPhone", "under 10m", or open Deals.',
    productIds: fallbackProductIds.slice(0, 2),
  };
}

function buildAiReply(input: string, analysis: DealRecord): ChatMessage {
  const normalized = input.toLowerCase();
  const discountText =
    analysis.deal.discount_pct === null || analysis.deal.discount_pct === undefined
      ? 'n/a'
      : `${analysis.deal.discount_pct}%`;
  const marketText = formatVnd(analysis.deal.market_price);

  let message = `${analysis.item.product_name} is `;

  if (analysis.deal.verdict === 'HOT_DEAL') {
    message += `a good match. It is ${discountText} below market (${marketText} market).`;
  } else if (analysis.deal.verdict === 'OK_DEAL') {
    message += `fair value. It is ${discountText} below market (${marketText} market).`;
  } else {
    message += `not a strong pick right now compared to market (${marketText}).`;
  }

  if (normalized.includes('how') || normalized.includes('work')) {
    message += ' Check uses cache + pricing baseline + price scoring.';
  }

  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    text: message,
    productIds: [analysis.id],
    analysis,
  };
}

function verdictLabel(verdict: DealRecord['deal']['verdict']) {
  if (verdict === 'HOT_DEAL') return 'good deal';
  if (verdict === 'OK_DEAL') return 'fair deal';
  return 'skip';
}

function ProductPreview({ deal }: { deal: DealRecord }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/deals/${deal.id}`)}
      style={({ pressed }) => [styles.productPreview, pressed && styles.productPreviewPressed]}>
      <View style={styles.productIcon}>
        <MaterialIcons name="sell" size={18} color="#0B57D0" />
      </View>
      <View style={styles.productCopy}>
        <Text style={styles.productTitle} numberOfLines={1}>
          {deal.item.product_name}
        </Text>
        <Text style={styles.productMeta} numberOfLines={1}>
          {formatVnd(deal.item.asking_price)} |{' '}
          {deal.deal.discount_pct === null || deal.deal.discount_pct === undefined
            ? 'n/a'
            : `${deal.deal.discount_pct}%`}{' '}
          | {verdictLabel(deal.deal.verdict)}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#64748B" />
    </Pressable>
  );
}

function MessageBubble({ message, catalog }: { message: ChatMessage; catalog: DealRecord[] }) {
  const isUser = message.role === 'user';
  const products = message.productIds
    ?.map((id) => catalog.find((deal) => deal.id === id))
    .filter((deal): deal is DealRecord => Boolean(deal));

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser ? (
        <View style={styles.avatar}>
          <MaterialIcons name="auto-awesome" size={18} color="#0F172A" />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.text}</Text>
        {products?.length ? (
          <View style={styles.productStack}>
            {products.map((deal) => (
              <ProductPreview key={deal.id} deal={deal} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ChatScreen() {
  const catalogQuery = useQuery({
    queryKey: ['deals', { chatCatalog: true }],
    queryFn: () => getDeals({ limit: 25 }),
    placeholderData: () => getSampleDeals({ limit: 25 }),
    staleTime: 30 * 1000,
  });
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const canSend = input.trim().length > 0 && !isSending;
  const catalog = useMemo(() => catalogQuery.data?.items ?? [], [catalogQuery.data?.items]);
  const starterMessages = useMemo<ChatMessage[]>(() => {
    if (!catalog.length) {
      return INITIAL_MESSAGES;
    }

    return INITIAL_MESSAGES.map((message) =>
      message.id === 'welcome'
        ? {
            ...message,
            productIds: catalog.slice(0, 2).map((deal) => deal.id),
          }
        : message
    );
  }, [catalog]);

  const listData = useMemo(
    () => (messages.length === INITIAL_MESSAGES.length ? starterMessages : messages),
    [messages, starterMessages]
  );

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    setSendError(null);
    setIsSending(true);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const assistantLoadingMessageId = `assistant-loading-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantLoadingMessageId,
      role: 'assistant',
      text: 'Running analysis...',
      isLoading: true,
      productIds: catalog.slice(0, 1).map((deal) => deal.id),
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

    try {
      const request: AnalyzeRequest = {
        text: trimmed,
        source: 'manual',
      };
      const analysis = await analyzeDeal(request);
      const reply = buildAiReply(trimmed, analysis);

      setMessages((current) =>
        current.map((message) => (message.id === assistantLoadingMessageId ? reply : message)),
      );
    } catch (error) {
      const fallback = buildLocalAssistantReply(trimmed, catalog);
      setSendError(error instanceof Error ? error.message : 'Analyze failed');
      setMessages((current) =>
        current.map((message) => (message.id === assistantLoadingMessageId ? fallback : message)),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardView}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.eyebrow}>Deal Radar</Text>
            <Text style={styles.title}>Chat</Text>
          </View>
          <View style={styles.modelPill}>
            <MaterialIcons name="smart-toy" size={17} color="#0B57D0" />
            <Text style={styles.modelText}>Deal bot</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} catalog={catalog} />}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}

        <ScrollView
          horizontal
          contentContainerStyle={styles.promptRailContent}
          showsHorizontalScrollIndicator={false}
          style={styles.promptRail}>
          {PROMPTS.map((prompt) => (
            <Pressable
              accessibilityRole="button"
              key={prompt}
              onPress={() => sendMessage(prompt)}
              style={({ pressed }) => [styles.promptChip, pressed && styles.promptChipPressed]}>
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              multiline
              placeholder="Type your message"
              placeholderTextColor="#64748B"
              value={input}
              onChangeText={setInput}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!canSend}
              onPress={() => sendMessage(input)}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
              <MaterialIcons name="arrow-upward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E4F5',
    borderWidth: 1,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#D3E3FD',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bubble: {
    borderRadius: 8,
    maxWidth: '86%',
    padding: 13,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 8,
  },
  composerWrap: {
    backgroundColor: '#F7FAFF',
    padding: 12,
    paddingTop: 8,
  },
  eyebrow: {
    color: '#0B57D0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  input: {
    color: '#0F172A',
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 38,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  keyboardView: {
    flex: 1,
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
    marginVertical: 6,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageText: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: '#B42318',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  messages: {
    padding: 16,
    paddingBottom: 8,
  },
  modelPill: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    paddingHorizontal: 11,
  },
  modelText: {
    color: '#0B57D0',
    fontSize: 12,
    fontWeight: '800',
  },
  productCopy: {
    flex: 1,
  },
  productIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  productMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  productPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E4F5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 10,
  },
  productPreviewPressed: {
    opacity: 0.72,
  },
  productStack: {
    gap: 8,
    marginTop: 12,
  },
  productTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  promptChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  promptChipPressed: {
    opacity: 0.72,
  },
  promptRail: {
    maxHeight: 48,
    paddingTop: 8,
  },
  promptRailContent: {
    gap: 8,
    paddingHorizontal: 12,
  },
  promptText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: '#F7FAFF',
    flex: 1,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sendButtonDisabled: {
    backgroundColor: '#A8C7FA',
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  userBubble: {
    backgroundColor: '#0F172A',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
});
