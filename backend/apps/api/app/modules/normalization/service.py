from __future__ import annotations

import json
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.events import EventBus
from app.shared.schemas import NormalizedItem


PRODUCTS = [
    {
        "name": "Samsung Galaxy S23 Ultra",
        "brand": "Samsung",
        "model": "Galaxy S23 Ultra",
        "keywords": ("s23 ultra", "s23u", "ss s23", "samsung s23", "galaxy s23"),
    },
    {
        "name": "iPhone 13 Pro",
        "brand": "Apple",
        "model": "iPhone 13 Pro",
        "keywords": ("iphone 13 pro", "ip13 pro", "ip 13 pro", "13 pro"),
    },
    {
        "name": "MacBook Air M1",
        "brand": "Apple",
        "model": "MacBook Air M1",
        "keywords": ("macbook air m1", "mac air m1", "mac m1", "mba m1"),
    },
    {
        "name": "AirPods Pro 2",
        "brand": "Apple",
        "model": "AirPods Pro 2",
        "keywords": ("airpods pro 2", "airpod pro 2", "app2", "airpods 2 pro"),
    },
]

SOLD_TERMS = ("da ban", "sold", "het hang", "chot xong", "bay roi", "da chot")
LOCATION_PATTERN = re.compile(r"\b(hn|hcm|sg|da nang|ha noi|sai gon)\b")
PRICE_PATTERNS = [
    re.compile(r"(?P<value>\d+(?:[.,]\d+)?)\s*(?:tr|trieu|m)\b"),
    re.compile(r"(?P<value>\d{7,9})\s*(?:vnd|d|dong)?\b"),
]


def product_signature(text: str) -> dict[str, str | None]:
    lowered = text.lower()
    for product in PRODUCTS:
        if any(keyword in lowered for keyword in product["keywords"]):
            return {
                "product_name": product["name"],
                "brand": product["brand"],
                "model": product["model"],
            }
    return {"product_name": None, "brand": None, "model": None}


def extract_price(text: str) -> int | None:
    lowered = text.lower().replace(",", ".")
    for pattern in PRICE_PATTERNS:
        match = pattern.search(lowered)
        if not match:
            continue
        value = float(match.group("value"))
        if value < 1000:
            return int(value * 1_000_000)
        return int(value)
    return None


def is_sold(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in SOLD_TERMS)


def detect_location(text: str) -> str | None:
    match = LOCATION_PATTERN.search(text.lower())
    if not match:
        return None
    mapping = {"hn": "Ha Noi", "hcm": "Ho Chi Minh City", "sg": "Ho Chi Minh City"}
    return mapping.get(match.group(1), match.group(1).title())


class MockNormalizer:
    def __init__(self, events: EventBus) -> None:
        self._events = events

    def normalize(self, normalized_text: str, raw_text_hash: str) -> NormalizedItem:
        product = product_signature(normalized_text)
        price = extract_price(normalized_text)
        sold = is_sold(normalized_text)
        confidence = 0.91 if product["product_name"] and price and not sold else 0.65
        if sold:
            confidence = 0.7
        item = NormalizedItem(
            product_name=product["product_name"],
            brand=product["brand"],
            model=product["model"],
            condition="used_good" if product["product_name"] else "unknown",
            asking_price=price,
            sold_status=sold,
            location=detect_location(normalized_text),
            confidence=confidence,
            raw_text_hash=raw_text_hash,
        )
        self._events.publish("PostNormalized", raw_text_hash=raw_text_hash, product_name=item.product_name)
        return item

    def compose_response(
        self,
        *,
        raw_text: str,
        item: NormalizedItem,
        market_price: int | None,
        discount_pct: float | None,
        verdict: str,
    ) -> str:
        product = item.product_name or "sản phẩm"
        if market_price is None or item.asking_price is None:
            return f"{product}: chưa đủ dữ liệu về giá thị trường hoặc giá chào bán để đánh giá chính xác."
        if item.sold_status:
            return f"{product}: bài này có dấu hiệu đã bán/đã chốt, nên không nên săn theo."
        if discount_pct is None:
            return f"{product}: chưa đủ dữ liệu để tính % chênh lệch rõ ràng."
        if verdict == "HOT_DEAL":
            return f"{product} đang có mức giá tốt: giảm khoảng {discount_pct:.0f}% so với thị trường. Có thể cân nhắc giao dịch."
        if verdict == "OK_DEAL":
            return f"{product} giá gần sát thị trường: giảm khoảng {discount_pct:.0f}%; nên xác nhận nhanh tình trạng."
        return f"{product} chưa thật sự lợi, mức chênh lệch chưa đủ cao cho quyết định mua ngay."

    def compose_search_reply(
        self,
        *,
        raw_text: str,
        inferred_product: str | None,
        raw_text_hash: str | None = None,
        market_price: int | None = None,
    ) -> str:
        _ = (raw_text, raw_text_hash)
        product = inferred_product or "sản phẩm"
        if market_price is None:
            return (
                f"{product}: hiện chưa có dữ liệu giá tham chiếu trong tập mẫu. "
                "Bạn có thể dán tin rao cụ thể (giá, tình trạng, phụ kiện) để mình chấm điểm nhanh."
            )
        return (
            f"{product}: có dữ liệu tham chiếu khoảng {market_price:,} VND, "
            "nhưng cần thêm bài đăng cụ thể để so sánh điểm."
        )


class OpenAINormalizer:
    def __init__(
        self,
        events: EventBus,
        *,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: float,
    ) -> None:
        self._api_key = api_key
        self._events = events
        self._model = model
        self._endpoint = f"{base_url.rstrip('/')}/chat/completions"
        self._timeout_seconds = timeout_seconds

    def normalize(self, normalized_text: str, raw_text_hash: str) -> NormalizedItem:
        self._ensure_api_key()
        payload = {
            "model": self._model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Extract one resale listing from noisy Vietnamese or English text. "
                        "Return only JSON with keys: product_name, brand, model, condition, "
                        "asking_price, currency, sold_status, location, confidence. "
                        "Use null when unknown. asking_price must be an integer VND amount when present. "
                        "confidence must be between 0 and 1."
                    ),
                },
                {"role": "user", "content": normalized_text},
            ],
        }
        data = self._request(payload)
        content = data["choices"][0]["message"]["content"]
        item = self._to_item(content, raw_text_hash)
        self._events.publish("PostNormalized", raw_text_hash=raw_text_hash, product_name=item.product_name)
        return item

    def compose_response(
        self,
        *,
        raw_text: str,
        item: NormalizedItem,
        market_price: int | None,
        discount_pct: float | None,
        verdict: str,
    ) -> str:
        self._ensure_api_key()
        payload = {
            "model": self._model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Bạn là chuyên gia hỗ trợ đánh giá tin rao hàng cũ. "
                        "Trả lời ngắn gọn 1-2 câu tiếng Việt, tránh markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Bài đăng: {raw_text}\n"
                        f"Sản phẩm: {item.product_name or 'không rõ'}\n"
                        f"Giá chào: {item.asking_price or 0}\n"
                        f"Giá thị trường: {market_price or 0}\n"
                        f"Discount: {discount_pct if discount_pct is not None else 'Không xác định'}\n"
                        f"Verdict: {verdict}\n"
                        "Hãy nhận xét ngắn gọn nên mua hay không và lưu ý nhanh nhất."
                    ),
                },
            ],
        }
        data = self._request(payload)
        content = data["choices"][0]["message"]["content"]
        response = str(content).strip()
        if not response:
            raise RuntimeError("OpenAI chat response is empty")
        self._events.publish("LLMReplyGenerated", raw_text_hash=item.raw_text_hash)
        return response

    def compose_search_reply(
        self,
        *,
        raw_text: str,
        inferred_product: str | None,
        raw_text_hash: str,
        market_price: int | None,
    ) -> str:
        self._ensure_api_key()
        payload = {
            "model": self._model,
            "temperature": 0.25,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Bạn là chuyên gia tư vấn mua bán đồ dùng điện tử cho người mới. "
                        "Trả lời ngắn gọn 2 câu tiếng Việt, tập trung vào cách chọn đúng sản phẩm "
                        "và câu hỏi cần xác nhận với người bán; tránh kết luận cứng là nên mua hay không."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Yêu cầu người dùng: {raw_text}\n"
                        f"Sản phẩm suy đoán: {inferred_product or 'chưa rõ'}\n"
                        f"Giá tham chiếu trong dữ liệu hiện tại: {market_price or 'chưa có'}\n"
                        "Hãy phản hồi như trợ lý thân thiện, có thể đưa checklist và đề xuất bước tiếp theo."
                    ),
                },
            ],
        }
        data = self._request(payload)
        content = data["choices"][0]["message"]["content"]
        response = str(content).strip()
        if not response:
            raise RuntimeError("OpenAI search response is empty")
        self._events.publish("LLMReplyGenerated", raw_text_hash=raw_text_hash)
        return response

    def _request(self, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            self._endpoint,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=self._timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"OpenAI normalizer request failed: {exc.code} {detail}") from exc
        except (URLError, TimeoutError) as exc:
            raise RuntimeError(f"OpenAI normalizer request failed: {exc}") from exc

    def _ensure_api_key(self) -> None:
        if not self._normalize_api_key(self._api_key):
            raise RuntimeError("OPENAI_API_KEY is required and must be a valid OpenAI key when USE_MOCK_LLM=false")

    @staticmethod
    def _to_item(content: str, raw_text_hash: str) -> NormalizedItem:
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("OpenAI normalizer returned non-object JSON")
        confidence = parsed.get("confidence", 0.0)
        try:
            confidence = max(0.0, min(1.0, float(confidence)))
        except (TypeError, ValueError):
            confidence = 0.0
        return NormalizedItem(
            product_name=parsed.get("product_name"),
            brand=parsed.get("brand"),
            model=parsed.get("model"),
            condition=parsed.get("condition") or "unknown",
            asking_price=parsed.get("asking_price"),
            currency=parsed.get("currency") or "VND",
            sold_status=bool(parsed.get("sold_status", False)),
            location=parsed.get("location"),
            confidence=confidence,
            raw_text_hash=raw_text_hash,
        )

    @staticmethod
    def _normalize_api_key(api_key: str) -> str:
        cleaned = api_key.strip()
        if not cleaned or cleaned == "REPLACE_WITH_REAL_OPENAI_KEY":
            return ""
        if not cleaned.startswith("sk-") and not cleaned.startswith("sk-proj-"):
            return ""
        if len(cleaned) < 20:
            return ""
        return cleaned
