# Apollo 13 Chronicles AI
An immersive, AI-powered first-person experience set inside Mission Control during the Apollo 13 emergency. Walk the floor, approach controllers, and talk to them in real time — powered by a local language model, voice synthesis, and physics evaluation.

 
Table of Contents
• Overview
• Features
• Project Structure
• Tech Stack
• Prerequisites
• Installation
• Running the App
• Environment Variables
• Architecture
o Frontend (React + Three.js)
o Backend (Express API)
• Characters & Roles
• Mission Timeline
• Gameplay Controls
• API Reference
• State Machine
• Timeline Branches
• Physics Evaluation Engine
• Voice System (TTS + STT)
• Collision Map
• Telemetry Simulation
• Mobile Support
• Known Limitations
• Roadmap
• License
 
Overview
Chronicles AI drops you inside a procedurally-scripted, historically-grounded recreation of the Apollo 13 Mission Control room on April 13, 1970. The simulation begins at Mission Elapsed Time T+55:55:20 — moments before oxygen tank 2 explodes in the Service Module.

You control a first-person character who walks the Mission Control floor, approaches flight controllers at their consoles, and holds real-time AI-driven conversations with them. Every controller has a distinct personality, technical domain, and role-specific knowledge base. The mission unfolds around you through scripted broadcasts, crew anomalies, and decision gates that branch the timeline depending on your choices.

This is not a game. It is an interactive historical simulation.

 
Features
Core Gameplay
• First-person 3D navigation of Mission Control using WASD / arrow keys or on-screen D-pad
• Proximity detection — walk up to any console and the controller greets you automatically
• AI-powered conversations — every character responds in character, in real time, with mission-accurate knowledge
• Quick Comms prompts — context-aware shortcut questions per controller
• Clock speed control — run mission time at 1×, 5×, 30×, or 60× to advance events faster
• Timeline jump — instantly skip to eight key mission moments
Mission Simulation
• Pre-crisis phase (T+55:55) — nominal operations, foreshadowing events, atmospheric tension
• Crisis phase — triggered by declaring an emergency or reaching the O2 tank explosion event
• Scripted broadcast events — 14 timed transmissions from controllers and Flight Director
• Decision gates — binary player choices that permanently affect the timeline branch
• Mission state tracking — six binary flags track whether power has been shed, CO₂ fixed, burn executed, emergency declared, LEM activated, and navigation transferred
Physics & Evaluation Engine
• PC+2 burn evaluation — validates the 30.7 m/s DPS burn at T+79:27 against orbital mechanics
• Power budget evaluation — validates 12-amp load shed for 87-hour return window
• CO₂ scrubber fix evaluation — validates the "mailbox" lithium hydroxide canister adapter
• Timeline branch updated in real time based on evaluation outcomes
AI Systems
• Auto-relay — when Kranz references an engineer by name (e.g., "Get TELMU on that"), that engineer automatically responds to Mission Control within 2.2 seconds
• Directive detection — natural language processing extracts Kranz directives from any conversation and queues them as pending orders
• Shared mission log — all controller conversations contribute to a shared 20-entry context window sent with every AI request
• State-aware responses — mission state (power reduced, CO₂ fixed, etc.) is passed to the AI so characters reflect current conditions accurately
Audio
• Procedural ambient audio — bandpass-filtered white noise + 60 Hz hum simulating Mission Control electronics
• Emergency alarm — 6-pulse square-wave oscillator on crisis declaration
• AI voice synthesis (TTS) — every controller response is spoken aloud via the /api/tts endpoint
• Voice input (STT) — hold the mic button, speak your question, release — transcribed via /api/transcribe
HUD & Telemetry
• O₂ Supply gauge — degrades in crisis mode at 0.08%/tick × clock speed
• Power gauge — degrades in crisis mode at 0.12%/tick × clock speed
• Live telemetry panel — altitude (km), velocity (km/s), CO₂ partial pressure (mmHg), cabin temperature (°C), battery voltage (V)
• Timeline branch badge — displays current branch: NOMINAL / SKIP-OUT / CO₂ BURNUP / POWER FAILURE
• Transcript export — full mission log downloadable as plain text
 
Project Structure
chronicles-ai/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx             # Root component — all game logic, UI, state
│   │   ├── world/
│   │   │   └── World.jsx       # Three.js 3D scene — room, consoles, characters
│   │   └── main.jsx
│   ├── public/
│   └── package.json
├── server/                     # Express backend
│   ├── index.js                # API server — /chat, /tts, /transcribe, /evaluate
│   ├── prompts/                # Per-character system prompt files (optional)
│   └── package.json
├── .env                        # Environment variables (never commit)
└── README.md
 
Tech Stack
Layer

Technology

Frontend framework

React 18 (Vite)

3D rendering

Three.js via @react-three/fiber

AI chat

OpenAI-compatible API (local or remote LLM)

Text-to-speech

OpenAI TTS API (tts-1 model)

Speech-to-text

OpenAI Whisper API

Physics evaluation

OpenAI function-calling / structured output

Backend

Express.js (Node 18+)

Audio

Web Audio API (procedural, no assets required)

Styling

Inline CSS-in-JSX (monospace design system)

 
 
Prerequisites
• Node.js 18 or higher
• npm 9 or higher
• An OpenAI API key (or a compatible local LLM endpoint, e.g., Ollama with OpenAI-compatible routes)
• A TTS-capable model endpoint (if using local LLM, ensure /v1/audio/speech is supported or swap the TTS call)
 
Installation
# 1. Clone the repository
git clone https://github.com/your-org/chronicles-ai.git
cd chronicles-ai

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install
 
Running the App
Open two terminal windows:

Terminal 1 — Start the API server:

cd server
npm run dev
# Listens on http://localhost:3001
Terminal 2 — Start the React client:

cd client
npm run dev
# Served at http://localhost:5173
Then open http://localhost:5173 in your browser. Click anywhere on the intro screen to begin.

Proxy note: The Vite dev server proxies all /api requests to http://localhost:3001. This is configured in vite.config.js. No CORS changes are needed for local development.

 
Environment Variables
Create a .env file in the server/ directory:

# Required
OPENAI_API_KEY=sk-...

# Optional — override base URL for local LLM (e.g., Ollama)
OPENAI_BASE_URL=http://localhost:11434/v1

# Optional — override default model
OPENAI_MODEL=gpt-4o

# Optional — TTS voice per character (comma-separated key:voice pairs)
# Available voices: alloy, echo, fable, onyx, nova, shimmer
TTS_VOICES=KRANZ:onyx,ENG-1:echo,ENG-2:fable,ENG-3:nova,ENG-4:alloy,ENG-5:shimmer

# Server port (default: 3001)
PORT=3001
 
Architecture
Frontend (React + Three.js)
All game logic lives in a single root component (App.jsx) using React hooks. There is intentionally no Zustand/Redux — state is managed through useState and useRef for performance-critical values.

Key state:

State variable

Type

Purpose

playerPos

[x, y, z]

Player world position (also tracked in playerPosRef for RAF loop)

isAlert

boolean

Whether crisis mode is active

missionTime

number

Elapsed seconds since simulation start

clockSpeed

1 \| 5 \| 30 \| 60

Time multiplier

timelineBranch

'A' \| 'B' \| 'C' \| 'D'

Current narrative outcome branch

missionState

MissionStateObject

Six binary mission milestone flags

selectedChar

CharObject \| null

Currently active conversation character

telemetry

TelemetryObject

Live alt/vel/CO₂/temp/batt values

evalResult

EvalResult \| null

Most recent physics evaluation panel data

 
Performance-critical refs (not state):

• playerPosRef — position read every animation frame without re-rendering
• clockSpeedRef — read inside setInterval without stale closure
• missionStateRef — read synchronously in AI calls without waiting for re-render
• sharedLogRef — mission-wide conversation log, written synchronously
Animation loop: A requestAnimationFrame loop runs continuously in useEffect. It reads the active key set (activeKeysRef) and D-pad direction (dpadDirRef), then calls stepPlayer() which resolves the movement direction from yaw angle, checks the collision map, and updates position.

Backend (Express API)
The server exposes four endpoints. All accept and return JSON except /api/transcribe (multipart form) and /api/tts (returns audio blob).

Each character has a system prompt constructed at request time from their role, bio, current mission time (formatted as T+ hours), mission state flags, and the shared conversation log. This ensures responses are always contextually accurate without any persistent server-side session.

 
Characters & Roles
Key

Call Sign

Title

Domain

KRANZ

KRANZ

Flight Director

Overall mission authority. Final call on all decisions.

ENG-1

FIDO

Flight Dynamics Officer

Spacecraft trajectory, orbital mechanics, splashdown prediction

ENG-2

GUIDO

Guidance Officer

Onboard guidance computer, navigation data, state vector

ENG-3

TELMU

Electrical, Environmental, Consumables

Power load, O₂ supply, CO₂ scrubbers, cabin temperature

ENG-4

RETRO

Retrofire Officer

Re-entry burn calculations, PC+2 burn, splashdown window

ENG-5

DOC

Flight Surgeon

Crew health, radiation exposure, hypothermia risk, vitals

 
Each character has:

• A unique color used throughout the UI (broadcast bar, chat border, name label)
• A proximity greeting triggered when the player walks within 1.9 units of their console
• Quick Comms — three pre-written questions appropriate to their domain
• A home position in 3D space and a crisis position they move to when the emergency is declared
 
Mission Timeline
Pre-Crisis Events (Phase A — nominal operations)
Time (sim seconds)

Character

Event

T+8s

KRANZ

All-stations system check

T+30s

TELMU

O₂ tank 2 heater anomaly flagged

T+75s

FIDO

Trajectory confirmed nominal

T+140s

KRANZ

Orders cryo stir on all tanks

T+200s

TELMU

MASTER ALARM — tank 2 dropout → Decision gate

T+240s

FIDO

Attitude disturbance observed from SM vent

 
Crisis Events (Phase B — post-explosion)
Time (crisis seconds)

Character

Event

+10s

TELMU

27-amp load, urgent shed request

+40s

RETRO

PC+2 burn window — 30.7 m/s at T+79:27 → Physics eval

+85s

DOC

Cabin temperature dropping, hypothermia warning

+120s

TELMU

Shed to 12 amps — 87-hour return power → Physics eval

+135s

KRANZ

"Work the problem" broadcast

+200s

GUIDO

CO₂ scrubber saturation — square-peg-in-round-hole problem

+250s

TELMU

Mailbox fix: cardboard, bag, sock, hose, tape → Physics eval

+310s

DOC

Lovell at 3.5 rem radiation — not critical yet

 
 
Gameplay Controls
Desktop
Input

Action

W / ↑

Move forward

S / ↓

Move backward

A / ←

Strafe left

D / →

Strafe right

Click + drag (canvas)

Look around (yaw + pitch)

Click character / select dropdown

Open conversation panel

Enter (chat input)

Send message

 
Mobile
Input

Action

On-screen D-pad

Move in four directions

Touch + drag (canvas)

Look around

Character select dropdown (topbar)

Open conversation panel

Mic button (hold → release)

Record voice input

 
Camera
The first-person camera uses mouse-drag (desktop) or touch-drag (mobile) for yaw (horizontal) and pitch (vertical, clamped to ±34°). Camera position smoothly follows the player with a 0.18 lerp coefficient per frame.

 
API Reference
POST /api/chat
Send a message to a character and receive an in-character AI response.

Request body:

{
 "character": "KRANZ",
 "message": "What are our options right now?",
 "history": [
   { "role": "user", "content": "What is the situation?" },
   { "role": "assistant", "content": "We have lost SM O2 tank 2..." }
 ],
 "sharedcontext": [
   { "char": "ENG-3", "text": "Power is at 27 amps and dropping." }
 ],
 "sessionid": "abc123",
 "missionmet": 56.2,
 "missionstate": {
   "powerReduced": false,
   "co2Fixed": false,
   "burnExecuted": false,
   "emergencyDeclared": true,
   "lemActivated": false,
   "navigationTransferred": false,
   "pendingDirectives": []
 }
}
Response:

{ "response": "All stations, this is now a contingency..." }
 
POST /api/tts
Convert text to speech for a named character.

Request body:

{
 "text": "Flight, we've lost SM O2 tank 2.",
 "character": "ENG-3"
}
Response: Audio blob (audio/mpeg or audio/webm)

 
POST /api/transcribe
Transcribe voice input from the player.

Request: multipart/form-data with field audio (WebM or MP4 blob)

Response:

{ "text": "How much power do we have left?" }
 
POST /api/evaluate
Run a physics evaluation on a mission decision.

Request body:

{
 "command": "burn",
 "params": { "delta_v_ms": 30.7, "met_hours": 79.46 },
 "sessionid": "abc123",
 "missionmet": 79.46
}
Response:

{
 "viable": true,
 "timeline": "NOMINAL — PACIFIC SPLASHDOWN",
 "outcome": "PC+2 burn is physically sound. 30.7 m/s at T+79:27 achieves free-return trajectory.",
 "physicsnote": "DPS engine provides sufficient delta-v. Burn duration ~30.7 seconds.",
 "timelinestate": { "branch": "A" },
 "transcriptcontext": [
   { "met": 79.46, "line": "RETRO confirms burn window." }
 ]
}
Supported command values: burn, power, co2

 
State Machine
The missionState object tracks six binary milestones. These flags are:

• Passed to the AI with every chat request so characters reflect current reality
• Updated automatically when player or character messages contain relevant keywords
• Used by the auto-relay system to determine what directives have been issued
missionState = {
 powerReduced:         false → true  (12-amp shed executed)
 co2Fixed:             false → true  (mailbox adapter built)
 burnExecuted:         false → true  (PC+2 burn fired)
 emergencyDeclared:    false → true  (contingency declared)
 lemActivated:         false → true  (Aquarius powered up as lifeboat)
 navigationTransferred:false → true  (nav data moved to LEM)
 pendingDirectives:    []            (Kranz orders queued for auto-relay)
}
State transitions are one-way (flags do not reset) and detected via broad keyword matching on both player messages and AI responses.

 
Timeline Branches
The timeline badge in the topbar reflects the current predicted outcome, updated by physics evaluations.

Branch

Label

Meaning

A

NOMINAL

Correct decisions made — crew returns safely

B

SKIP-OUT CREW LOST

Re-entry angle too shallow — spacecraft skips off atmosphere

C

CO₂ BURNUP

CO₂ scrubbers failed — crew incapacitated before splashdown

D

POWER FAILURE

Insufficient power margin — systems fail before re-entry

 
Branch is set by the /api/evaluate response's timelinestate.branch field. The color coding in the UI is: A = teal (nominal), B = red, C = orange, D = red.

 
Physics Evaluation Engine
Three evaluations are triggered automatically by scripted events during the crisis phase. Each sends parameters to the /api/evaluate endpoint which uses the AI to perform historically-grounded physics analysis.

PC+2 Burn (command: "burn")
• Parameters: delta_v_ms: 30.7, met_hours: 79.46
• What it checks: Whether a 30.7 m/s retrograde burn at T+79:27 achieves a free-return trajectory with Pacific splashdown
• Historical basis: The actual PC+2 burn performed by Apollo 13 on April 14, 1970
Power Budget (command: "power")
• Parameters: load_amps: 12
• What it checks: Whether 12-amp load shed provides sufficient power margin for the 87-hour return journey
• Historical basis: Mission Control's actual power conservation procedures for Aquarius
CO₂ Fix (command: "co2")
• Parameters: materials: ["cardboard", "plastic bag", "sock", "hose", "duct tape"]
• What it checks: Whether an improvised lithium hydroxide canister adapter can be built from available materials
• Historical basis: The actual "mailbox" fix devised by the Tiger Team on April 14, 1970
 
Voice System (TTS + STT)
Text-to-Speech
Every AI response is spoken aloud. The frontend calls /api/tts immediately after receiving the chat response. Audio is played via the Web Audio API. The speaking character's chat panel border turns yellow and a SPEAKING badge appears. Only one voice plays at a time — starting a new response stops the previous one.

Voice assignment is configurable per character via the TTS_VOICES environment variable. Default voices are assigned to match character tone (e.g., onyx for the authoritative Flight Director).

Speech-to-Text
The mic button in the chat panel uses the browser's MediaRecorder API to capture audio in WebM (or MP4 on Safari). On release, the blob is sent to /api/transcribe. The transcribed text populates the input field and auto-sends after a 300ms delay.

Browser permissions: Microphone access must be granted. If denied, an alert is shown.

 
Collision Map
The Mission Control floor is defined by an 18×25 tile grid (COLLISION_MAP). Each cell is one of:

Value

Meaning

0

Walkable floor

1

Console / workstation (blocked)

2

Wall / boundary (blocked)

4

Special walkable zone (crew area, walkways)

 
Player world coordinates are mapped to grid indices with:

tx = Math.floor(wx + 12.5)
tz = Math.floor(wz + 9.5)
Movement uses axis-separated collision resolution — if the diagonal step is blocked, the X-axis and Z-axis are tested independently. This prevents the player from getting stuck on corners.

 
Telemetry Simulation
All telemetry values are simulated in a 1-second interval scaled by clockSpeed.

Channel

Nominal

Crisis degradation

Unit

Altitude

199,340

−(random × 0.8) per tick

km

Velocity

1.530

Slight increase (gravity assist)

km/s

CO₂

2.5

+0.018 per tick (crisis)

mmHg

Temperature

21.0

−0.04 per tick (crisis)

°C

Battery

29.5

−0.025 per tick (crisis)

V

 
Color thresholds on telemetry values provide visual warnings: teal = nominal, amber = caution, red = critical.

 
Mobile Support
The UI is fully responsive. On screens ≤480px:

• The HUD and telemetry panels are hidden (performance)
• The topbar title is hidden
• The chat panel expands to near-full-width
• The D-pad shifts to bottom-right
• Broadcast bar spans 96% of viewport width
Touch controls use passive: true event listeners for scroll performance. D-pad buttons use onPointerDown / onPointerUp (not onClick) for zero-delay response. Camera drag is blocked when touch starts inside any UI panel.

 
Known Limitations
• No persistent sessions — refreshing the page resets all state. There is no save/load.
• AI response quality depends on model — smaller local models may break character or give anachronistic responses. GPT-4o is recommended for full fidelity.
• TTS latency — on slow connections or overloaded local endpoints, TTS may lag 2–5 seconds behind the text response.
• Single scroll region — the chat panel has an independent scroll area; the main canvas does not scroll.
• No multiplayer — session ID is generated per browser tab and is not shared.
• localStorage disabled — clock speed and theme preferences reset on page reload (sandboxed iframe limitation).
 
Roadmap
• [ ] Additional characters: FIDO backup, Aquarius crew (Lovell, Haise, Swigert)
• [ ] Voice lines for the crew aboard the spacecraft
• [ ] Additional decision gates: LEM activation, navigation transfer, re-entry blackout
• [ ] Save/restore mission state via URL hash encoding
• [ ] Multiplayer mode: two players share the same session ID and see each other's messages
• [ ] Visual console displays: scrolling telemetry data on 3D screen props
• [ ] Historical accuracy mode: AI responses locked to documented statements only
 
License
MIT License. See LICENSE for details.

This project is a historical fiction simulation for educational purposes. All character names, mission data, and dialogue are based on publicly documented historical records of the Apollo 13 mission (April 11–17, 1970).
