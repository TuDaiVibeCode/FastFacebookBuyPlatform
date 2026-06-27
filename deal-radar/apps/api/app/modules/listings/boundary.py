from __future__ import annotations

from datetime import datetime, timezone

from app.shared.schemas import AnalyzeResponse, ListingBoundary


def to_listing_boundary(record: AnalyzeResponse) -> ListingBoundary:
    return ListingBoundary(
        product_name=record.item.product_name,
        asking_price=record.item.asking_price,
        source=record.source.source,
        source_url=record.source.source_url,
        freshness_at=datetime.now(timezone.utc),
        dedupe_hash=record.item.raw_text_hash,
        confidence=record.item.confidence,
        location=record.item.location,
        search_text=f"{record.raw_text} {record.item.product_name or ''}".strip(),
    )

