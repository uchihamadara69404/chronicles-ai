# Chronicles AI

An immersive AI-powered Apollo 13 mission simulator where users interact with historical figures using voice and a 3D interface.

## Architecture

- **Frontend**: React 19 + Vite, Three.js / @react-three/fiber for 3D world, port 5000
- **Backend**: FastAPI (Python) + Groq SDK (llama-3.3-70b-versatile), port 8000

## Project Layout

```
chronicles-ai/client/   # Vite/React frontend
server/                 # FastAPI backend
```

## Running Locally

Two workflows are configured:
- **Start application** — `cd chronicles-ai/client && npm run dev` (port 5000, webview)
- **Backend API** — `uvicorn server.main:app --host localhost --port 8000` (port 8000, console)

Frontend proxies `/api` requests to the backend via Vite proxy config.

## Environment Variables / Secrets

- `GROQ_API_KEY` — Required. Groq API key for LLM inference. Get one at https://console.groq.com

## Deployment

- Target: **autoscale**
- Build: `cd chronicles-ai/client && npm install && npm run build`
- Run: `uvicorn server.main:app --host 0.0.0.0 --port 5000`
- Note: For production deployment, the frontend static build should be served by the FastAPI backend (needs configuration adjustment if deploying both services).

## Key Features

- Voice-enabled interaction with Apollo 13 mission control characters (Gene Kranz, FIDO, GUIDO, TELMU, RETRO, Flight Surgeon)
- Top-down 3D mission control world built with Three.js
- Historical scenario: Apollo 13, April 13 1970, post oxygen tank explosion
- AI responses kept under 3 sentences — urgent crisis atmosphere
