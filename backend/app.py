from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from channels import get_channel_message
from data_sources import get_data_sources


app = FastAPI()

_BASE_DIR = Path(__file__).resolve().parent
_FRONTEND_BUILD = _BASE_DIR.parent / "frontend" / "build" / "client"


def _safe_read_index() -> str:
    index_path = _FRONTEND_BUILD / "index.html"
    if index_path.exists():
        return index_path.read_text(encoding="utf-8")
    return """<!DOCTYPE html><html><body><p>Build the frontend to serve static assets or run the Vite dev server.</p></body></html>"""


if _FRONTEND_BUILD.exists():
    static_dir = _FRONTEND_BUILD / "assets"
    if static_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(static_dir)), name="assets")

    @app.get("/")
    async def root() -> HTMLResponse:  # pragma: no cover - thin wrapper for static hosting
        return HTMLResponse(_safe_read_index())


def _parse_preferences(message: str) -> Tuple[List[str], List[str]]:
    try:
        payload = json.loads(message)
    except json.JSONDecodeError:
        return [], []

    sources = payload.get("dataSources")
    channels = payload.get("channels")

    def _normalize(value: object) -> List[str]:
        if isinstance(value, list):
            return [str(item) for item in value]
        if isinstance(value, str):
            return [value]
        return []

    return _normalize(sources), _normalize(channels)


def _build_right_time(channel_key: str) -> dict:
    timezone = random.choice([
        "America/New_York",
        "America/Los_Angeles",
        "Europe/London",
        "Asia/Singapore",
    ])
    window_minutes = random.choice([15, 30, 45, 60, 90])
    send_at = datetime.utcnow() + timedelta(minutes=window_minutes)
    return {
        "send_at": send_at.replace(microsecond=0).isoformat() + "Z",
        "time_zone": timezone,
        "window_minutes": window_minutes,
        "rationale": f"Optimize delivery window for {channel_key} engagement",
    }


def _build_metrics() -> dict:
    return {
        "expected_lift": f"{random.randint(4, 18)}%",
        "confidence_score": round(random.uniform(0.55, 0.92), 2),
        "sample_size": random.randint(1200, 4000),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()

    selected_sources: List[str] = []
    selected_channels: List[str] = []

    try:
        try:
            initial_message = await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
            selected_sources, selected_channels = _parse_preferences(initial_message)
        except asyncio.TimeoutError:
            selected_sources, selected_channels = [], []

        while True:
            data_sources, audience = get_data_sources(selected_sources)
            channel = get_channel_message(selected_channels, audience, data_sources)

            payload = {
                "campaignId": random.randint(1000, 9999),
                "generatedAt": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
                "rightTime": _build_right_time(channel["channel"]),
                "rightChannel": {
                    "id": channel["channel"],
                    "name": channel["display_name"],
                    "reason": channel["reason"],
                    "supportingSignals": channel["supporting_signals"],
                },
                "rightMessage": {
                    "headline": channel["headline"],
                    "body": channel["body"],
                    "cta": channel["cta"],
                    "preview": channel["preview"],
                    "tone": channel["tone"],
                },
                "rightAudience": audience,
                "dataSources": data_sources,
                "metrics": _build_metrics(),
            }

            await websocket.send_json(payload)

            try:
                while True:
                    update_message = await asyncio.wait_for(websocket.receive_text(), timeout=0.05)
                    selected_sources, selected_channels = _parse_preferences(update_message)
            except asyncio.TimeoutError:
                pass

            await asyncio.sleep(3)

    except WebSocketDisconnect:
        # Client closed the connection gracefully; nothing else to do.
        return
