import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoltLightning,
  faDatabase,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";

import type { CacheState } from "@/lib/types";

const cacheStyles: Record<CacheState, string> = {
  miss: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  redis_hit: "border-blue-500/40 bg-blue-500/12 text-blue-800 dark:text-blue-200",
  semantic_hit: "border-cyan-500/40 bg-cyan-500/12 text-cyan-800 dark:text-cyan-200",
};

const cacheLabels: Record<CacheState, string> = {
  miss: "New check",
  redis_hit: "Quick match",
  semantic_hit: "Smart match",
};

const cacheIcons: Record<CacheState, typeof faBoltLightning> = {
  miss: faBoltLightning,
  redis_hit: faDatabase,
  semantic_hit: faLayerGroup,
};

export function CacheBadge({ cache }: { cache: CacheState }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${cacheStyles[cache]}`}
    >
      <FontAwesomeIcon icon={cacheIcons[cache]} className="h-3 w-3" />
      {cacheLabels[cache]}
    </span>
  );
}
