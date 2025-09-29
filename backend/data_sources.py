from __future__ import annotations

import random
from collections import Counter
from typing import Dict, Iterable, List, Tuple

AudienceProfile = Dict[str, object]
SourceData = Dict[str, object]


_AGE_RANGES = ["18-24", "25-34", "35-44", "45-54"]
_LOCATIONS = ["New York", "California", "Texas", "Florida", "Illinois"]
_INTEREST_BUCKETS = {
    "gtm": ["flash sales", "new arrivals", "sustainability"],
    "facebook_pixel": ["loyalty rewards", "community", "exclusive drops"],
    "google_ads_tag": ["best sellers", "gift ideas", "seasonal picks"],
}


def _choose_age() -> str:
    return random.choice(_AGE_RANGES)


def _choose_location() -> str:
    return random.choice(_LOCATIONS)


def _gtm_payload() -> Tuple[SourceData, AudienceProfile]:
    behavior = random.choice([
        "abandoned_cart",
        "category_browser",
        "new_visitor",
    ])
    page = random.choice([
        "/products/smart-speaker",
        "/collections/summer-edit",
        "/blog/best-of-week",
    ])

    profile: AudienceProfile = {
        "age_range": _choose_age(),
        "location": _choose_location(),
        "interests": [random.choice(_INTEREST_BUCKETS["gtm"])],
        "behaviors": ["Viewed " + page.split("/")[-1].replace("-", " ")],
        "lifecycle_stage": random.choice(["prospect", "returning", "at-risk"]),
    }

    data: SourceData = {
        "page_view": page,
        "recent_event": behavior,
        "time_on_site_seconds": random.randint(30, 240),
        "active_session": random.choice([True, False]),
    }

    return data, profile


def _facebook_pixel_payload() -> Tuple[SourceData, AudienceProfile]:
    event = random.choice(["AddToCart", "Purchase", "Lead", "ViewContent"])
    value = round(random.uniform(35, 220), 2)
    device = random.choice(["mobile", "desktop", "tablet"])

    profile: AudienceProfile = {
        "age_range": _choose_age(),
        "location": _choose_location(),
        "interests": [random.choice(_INTEREST_BUCKETS["facebook_pixel"])],
        "behaviors": [f"Facebook Pixel event: {event}"],
        "preferred_device": device,
    }

    data: SourceData = {
        "event": event,
        "value": value,
        "currency": "USD",
        "device": device,
    }

    return data, profile


def _google_ads_payload() -> Tuple[SourceData, AudienceProfile]:
    campaign = random.choice([
        "spring_promo",
        "retargeting_audience",
        "brand_awareness",
    ])
    conversions = random.randint(0, 12)
    spend = round(random.uniform(120, 560), 2)

    profile: AudienceProfile = {
        "age_range": _choose_age(),
        "location": _choose_location(),
        "interests": [random.choice(_INTEREST_BUCKETS["google_ads_tag"])],
        "behaviors": [f"Engaged with {campaign.replace('_', ' ')} campaign"],
        "lifecycle_stage": random.choice(["new", "loyal", "lapsing"]),
    }

    data: SourceData = {
        "campaign": campaign,
        "click_through_rate": round(random.uniform(0.8, 3.4), 2),
        "conversions": conversions,
        "spend": spend,
    }

    return data, profile


_SOURCE_FACTORIES = {
    "gtm": _gtm_payload,
    "facebook_pixel": _facebook_pixel_payload,
    "google_ads_tag": _google_ads_payload,
}


def _merge_audience_hints(hints: Iterable[AudienceProfile]) -> AudienceProfile:
    hints = list(hints)
    if not hints:
        # Fallback profile when nothing is selected.
        return {
            "age_range": _choose_age(),
            "location": _choose_location(),
            "interests": ["new arrivals"],
            "behaviors": ["Browsing catalog"],
            "lifecycle_stage": "unknown",
        }

    def _most_common(key: str) -> str:
        values = [hint.get(key) for hint in hints if hint.get(key)]
        if not values:
            return "unknown"
        if isinstance(values[0], list):
            # Flatten lists when necessary.
            flat_values: List[str] = [item for sub in values for item in sub]  # type: ignore[arg-type]
            if not flat_values:
                return "unknown"
            return Counter(flat_values).most_common(1)[0][0]
        return Counter(values).most_common(1)[0][0]

    interests: List[str] = sorted(
        {interest for hint in hints for interest in hint.get("interests", [])}
    )
    behaviors: List[str] = sorted(
        {behavior for hint in hints for behavior in hint.get("behaviors", [])}
    )

    lifecycle = _most_common("lifecycle_stage")
    if lifecycle == "unknown":
        lifecycle = random.choice(["prospect", "returning", "loyal"])

    profile: AudienceProfile = {
        "age_range": _most_common("age_range"),
        "location": _most_common("location"),
        "interests": interests or ["general catalog"],
        "behaviors": behaviors or ["Exploring products"],
        "lifecycle_stage": lifecycle,
    }

    preferred_device = _most_common("preferred_device")
    if preferred_device != "unknown":
        profile["preferred_device"] = preferred_device

    return profile


def get_data_sources(selected_sources: Iterable[str] | None = None) -> Tuple[Dict[str, SourceData], AudienceProfile]:
    """Return simulated source data and a blended audience profile."""

    normalized = [source.lower() for source in selected_sources or []]
    if not normalized:
        normalized = list(_SOURCE_FACTORIES.keys())

    data_sources: Dict[str, SourceData] = {}
    audience_hints: List[AudienceProfile] = []

    for source in normalized:
        factory = _SOURCE_FACTORIES.get(source)
        if not factory:
            continue
        data, audience = factory()
        data_sources[source] = data
        audience_hints.append(audience)

    # Ensure we always have at least one data source payload.
    if not data_sources:
        data, audience = _gtm_payload()
        data_sources["gtm"] = data
        audience_hints.append(audience)

    blended_audience = _merge_audience_hints(audience_hints)
    return data_sources, blended_audience
