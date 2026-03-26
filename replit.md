# Chronicles AI

An immersive AI-powered Apollo 13 mission simulator where users interact with historical figures using voice and a 3D top-down interface.

## Architecture

- **Frontend**: React 19 + Vite, Three.js / @react-three/fiber for 3D world, port 5000
- **Backend**: FastAPI (Python) + Groq SDK (llama-3.3-70b-versatile), port 8000

## Project Layout

```
chronicles-ai/client/src/
  App.jsx           # Main simulation — events, UI, physics wiring, character movement
  world/World.jsx   # 3D mission control floor + character mesh rendering
  world/Tile.jsx    # Individual floor tile mesh
  characters/
    Character.jsx   # Animated character mesh with lerp movement + talking effects
server/
  main.py           # FastAPI: /chat, /evaluate, /tts endpoints + transcript context
  physics.py        # Real Apollo 13 orbital mechanics evaluators
  requirements.txt
```

## Running Locally

Two workflows configured:
- **Start application** — `cd chronicles-ai/client && npm run dev` (port 5000, webview)
- **Backend API** — `uvicorn server.main:app --host localhost --port 8000` (port 8000, console)

Frontend proxies `/api` → backend via Vite proxy config.

## Environment Variables / Secrets

- `GROQ_API_KEY` — Required. Groq API key for LLM inference. https://console.groq.com

## Deployment

- Target: **autoscale**
- Build: `cd chronicles-ai/client && npm install && npm run build`
- Run: `uvicorn server.main:app --host 0.0.0.0 --port 5000`

## Key Features

### Character Interaction
- Voice-enabled (push-to-talk) + typed comms with 6 characters: Gene Kranz, FIDO, GUIDO, TELMU, RETRO, Flight Surgeon
- Browser speechSynthesis TTS (zero-latency)
- Cross-character shared memory — characters reference each other's recent exchanges

### 3D World
- Top-down isometric mission control floor in Three.js
- Characters **smoothly lerp-animate** across the floor when crisis events fire
- Characters move to crisis positions when broadcasting, return home afterward
- KRANZ steps forward, TELMU rushes center, RETRO/Doc move toward main floor

### Physics Engine (`server/physics.py`)
- Real Apollo 13 orbital mechanics with historical NASA constants
- Three evaluators: `evaluate_burn`, `evaluate_power`, `evaluate_co2`
- `/evaluate` endpoint returns: `viable`, `outcome`, `timeline`, `physics_note`
- Results shown in floating Physics Evaluation panel in the UI

### Mission Forking (Timeline System)
- Every `/evaluate` call updates a per-session `timeline_state` on the backend
- Four possible branches: A (Nominal), B (Skip-out), C (Burnup/CO2), D (Power failure)
- Timeline badge displayed in top bar; LLM characters receive their timeline context
- Characters in bad timelines respond accordingly — no pretending

### Transcript RAG (Simplified)
- 12 real Apollo 13 transcript excerpts embedded in `server/physics.py`
- `get_transcript_context(met_hours)` returns nearest 2 entries to current MET
- Injected into every `/chat` system prompt so characters cite real log data
- `/evaluate` also returns nearest transcript entry

### Mission Event System
- MISSION_EVENTS: scripted broadcasts at wall-clock seconds since page load
- CRISIS_EVENTS: fire by seconds elapsed since crisis was declared
- Decision overlay appears at T+200s (O2 anomaly) — user chooses to DECLARE EMERGENCY or HOLD
- Physics evaluations auto-trigger alongside key crisis broadcasts (PC+2 burn, power, CO2)

### UI
- Typewriter intro sequence with real mission data
- Live telemetry panel: ALT / VEL / CO2 / TEMP / BATT
- O2 and power gauges with color transitions
- Mission elapsed time display (T+55:55:20 base + elapsed)
- Timestamps on every chat bubble
- Export transcript as .txt file
- Swipe-to-close chat panel on mobile
- Full responsive layout (phone / tablet / desktop breakpoints)
- Ambient Web Audio atmosphere (HVAC noise + 60Hz hum + crisis alarm)
