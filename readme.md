# Campaign Orchestrator

This project demonstrates an intelligent campaign planner that connects simulated marketing data sources with multiple delivery channels. The frontend presents a chat-inspired dashboard that streams JSON payloads describing the **right time**, **right channel**, **right message**, and **right audience** for each generated campaign.

## Features

- Select between three data sources (GTM, Facebook Pixel, Google Ads) and four activation channels (Email, SMS, WhatsApp, Ads).
- Real-time WebSocket stream from FastAPI sends structured campaign payloads enriched with dynamic timing windows, audience profiles, and creative recommendations.
- React interface renders payloads as conversational cards, highlighting data signals and message guidance for each channel.

## Getting Started

### Requirements

- Node.js 18+
- Python 3.11+

### Install dependencies

```bash
cd frontend
npm install

cd ../backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run the backend

```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Run the frontend

```bash
cd frontend
npm run dev -- --host
```

The React app expects the backend WebSocket at `ws://localhost:8000/ws`. You can override this by setting `VITE_WS_URL` in a `.env` file inside `frontend/`.

## JSON Payload Structure

Each streamed payload contains:

- `rightTime`: send time suggestion, timezone, and delivery window rationale.
- `rightChannel`: selected channel, reasoning, and supporting signals from the data sources.
- `rightMessage`: headline, tone, CTA, and preview text ready for activation.
- `rightAudience`: aggregated attributes (location, age range, behaviors, interests).
- `dataSources`: raw telemetry from the selected integrations.
- `metrics`: expected lift, confidence score, and sample size to inform prioritization.

You can use these payloads to power future automation that executes real campaigns across the chosen channels.
