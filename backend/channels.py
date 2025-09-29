from __future__ import annotations

import random
from typing import Dict, Iterable, List


def _pick_interest(audience: Dict[str, object]) -> str:
    interests = audience.get("interests")
    if isinstance(interests, list) and interests:
        return random.choice(interests)
    return "our newest collection"


def _pick_behavior(audience: Dict[str, object]) -> str:
    behaviors = audience.get("behaviors")
    if isinstance(behaviors, list) and behaviors:
        return random.choice(behaviors)
    return "recent activity"


_CHANNEL_BLUEPRINTS = {
    "email": {
        "label": "Email",
        "headline": "Bring them back with a curated edit",
        "body": (
            "Hi {{name}}, we noticed {{behavior}}. "
            "Showcase {{interest}} with a personalized collection and highlight "
            "the benefits of returning now."
        ),
        "cta": "Shop the tailored picks",
        "tone": "helpful",
    },
    "sms": {
        "label": "SMS",
        "headline": "Keep momentum with a short nudge",
        "body": (
            "Quick reminder: {{interest}} is trending right now. "
            "Reward the last action with a time-bound perk."
        ),
        "cta": "Tap to redeem offer",
        "tone": "urgent",
    },
    "whatsapp": {
        "label": "WhatsApp",
        "headline": "Start a helpful conversation",
        "body": (
            "Open with a friendly check-in referencing {{behavior}} and suggest "
            "two relevant items inspired by {{interest}}. Include an embedded "
            "carousel for rich context."
        ),
        "cta": "View personalized picks",
        "tone": "conversational",
    },
    "ads": {
        "label": "Ads",
        "headline": "Retarget with dynamic creative",
        "body": (
            "Deploy a responsive ad set tuned to {{interest}} audiences. "
            "Mirror the onsite experience and keep the message consistent "
            "with their {{behavior}}."
        ),
        "cta": "Return to complete your journey",
        "tone": "persuasive",
    },
}


def get_channel_message(
    selected_channels: Iterable[str] | None,
    audience: Dict[str, object],
    data_sources: Dict[str, Dict[str, object]],
) -> Dict[str, object]:
    """Return the selected channel with a tailored narrative."""

    normalized = [channel.lower() for channel in selected_channels or []]
    available = [channel for channel in normalized if channel in _CHANNEL_BLUEPRINTS]
    if not available:
        available = list(_CHANNEL_BLUEPRINTS.keys())

    channel_key = random.choice(available)
    blueprint = _CHANNEL_BLUEPRINTS[channel_key]

    interest = _pick_interest(audience)
    behavior = _pick_behavior(audience)
    location = audience.get("location", "their area")

    supporting_signals: List[str] = []
    if channel_key == "ads" and "google_ads_tag" in data_sources:
        campaign = data_sources["google_ads_tag"].get("campaign")
        supporting_signals.append(f"Recent campaign momentum: {campaign}")
    if channel_key == "email" and "gtm" in data_sources:
        page_view = data_sources["gtm"].get("page_view")
        supporting_signals.append(f"Last seen browsing {page_view}")
    if channel_key in {"sms", "whatsapp"} and "facebook_pixel" in data_sources:
        event = data_sources["facebook_pixel"].get("event")
        supporting_signals.append(f"Latest conversion event: {event}")

    message_body = (
        blueprint["body"]
        .replace("{{interest}}", interest)
        .replace("{{behavior}}", behavior.lower())
        .replace("{{name}}", "there")
    )

    preview = f"Focus on {interest} for {location} audiences"

    return {
        "channel": channel_key,
        "display_name": blueprint["label"],
        "headline": blueprint["headline"],
        "body": message_body,
        "cta": blueprint["cta"],
        "tone": blueprint["tone"],
        "preview": preview,
        "supporting_signals": supporting_signals,
        "reason": f"{blueprint['label']} fits {interest} interest with {behavior.lower()} context",
    }
