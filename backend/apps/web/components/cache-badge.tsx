import type { CacheState } from "@/lib/types";

const LABELS: Record<CacheState, string> = {
  miss: "Cache miss",
  redis_hit: "Redis hit",
  semantic_hit: "Semantic hit",
};

const STYLES: Record<CacheState, string> = {
  miss: "border-[#d6a553] bg-[#fff6de] text-[#6f4c08] dark:border-[#7f5b18] dark:bg-[#332811] dark:text-[#f6d58a]",
  redis_hit:
    "border-[#4fa892] bg-[#e2f7ef] text-[#0f5f50] dark:border-[#286d61] dark:bg-[#102d29] dark:text-[#8be0d1]",
  semantic_hit:
    "border-[#6f9cd3] bg-[#e8f1ff] text-[#225486] dark:border-[#315a83] dark:bg-[#122438] dark:text-[#9bc5f3]",
};

export function CacheBadge({ cache }: { cache: CacheState }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${STYLES[cache]}`}
    >
      {LABELS[cache]}
    </span>
  );
}
