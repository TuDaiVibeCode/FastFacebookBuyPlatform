from __future__ import annotations

from app.shared.schemas import CacheMetrics


class MetricsRecorder:
    def __init__(self) -> None:
        self.total_analyze_requests = 0
        self.exact_cache_hits = 0
        self.semantic_cache_hits = 0
        self.llm_calls_avoided = 0
        self.llm_calls_made = 0

    def snapshot(self) -> CacheMetrics:
        hits = self.exact_cache_hits + self.semantic_cache_hits
        hit_rate = round(hits / self.total_analyze_requests, 4) if self.total_analyze_requests else 0.0
        return CacheMetrics(
            total_analyze_requests=self.total_analyze_requests,
            exact_cache_hits=self.exact_cache_hits,
            semantic_cache_hits=self.semantic_cache_hits,
            llm_calls_avoided=self.llm_calls_avoided,
            llm_calls_made=self.llm_calls_made,
            estimated_cost_saved=round(self.llm_calls_avoided * 0.002, 4),
            cache_hit_rate=hit_rate,
        )
