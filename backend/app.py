from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
import random
import asyncio
from data_sources import get_data_sources
from channels import get_channel_message

app = FastAPI()

# Serve the frontend from the static folder
app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")

@app.get("/")
async def root():
    return HTMLResponse(open("frontend/build/index.html").read())

# WebSocket connection to send JSON data
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Simulate streaming JSON output
            data_sources = get_data_sources()
            channel = get_channel_message()

            payload = {
                "campaign_id": random.randint(1000, 9999),
                "data_sources": data_sources,
                "channel": channel["channel"],
                "audience": {
                    "age": random.choice(["18-24", "25-34", "35-44"]),
                    "location": random.choice(["New York", "California", "Texas"]),
                    "interests": random.choice([["tech", "gaming"], ["fashion", "beauty"]]),
                },
                "message": {
                    "subject": f"Exclusive offer on {channel['channel']}!",
                    "body": f"Hey [User], get a special offer on your favorite items. Use code XYZ."
                },
                "timing": {
                    "send_at": "2025-09-30T10:00:00Z",
                    "time_zone": "America/New_York"
                }
            }

            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(3)  # Simulate streaming every 3 seconds

    except WebSocketDisconnect:
        print("Client disconnected")

# Run the app with:
# uvicorn app:app --reload
