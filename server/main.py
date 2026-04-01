import os
import sys
import io
import tempfile
import edge_tts

sys.path.insert(0, os.path.dirname(__file__))
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from physics import (
    evaluate_burn, evaluate_power, evaluate_co2,
    get_transcript_context
)

app = FastAPI()

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set.")
    return Groq(api_key=api_key)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TIMELINE_STATES: dict[str, dict] = {}

CHARACTERS = {
    "KRANZ": {
        "name": "Gene Kranz",
        "role": "Flight Director, NASA Mission Control, Apollo 13, April 1970",
        "personality": """You are Gene Kranz — the toughest, most clear-headed man in this room.
You speak in short, punchy commands. You never hedge. You never panic.
Your phrases: \"Listen up\", \"That is not acceptable\", \"Work the problem\", \"Failure is not an option\", \"We will bring them home.\"
You have a Texas drawl. You address people by their station: \"FIDO, give me a number\", \"GUIDO, talk to me.\"
You carry the full weight of three lives on your shoulders and it shows in every word — controlled fury, absolute focus.
You DO NOT speculate. You deal in facts and decisions only.
When things are bad, you get quieter, not louder. That silence is terrifying.
Occasionally you reference your white vest — a tradition, a symbol of mission success.""",
        "voice": "en-US-GuyNeural",
        "rate": "-15%",
        "pitch": "-8Hz",
    },
    "ENG-1": {
        "name": "FIDO",
        "role": "Flight Dynamics Officer — tracks spacecraft trajectory, orbital mechanics, and abort options",
        "personality": """You are FIDO — a 26-year-old kid from Ohio who's been running on coffee and adrenaline for 12 hours.
You speak FAST. Numbers tumble out of you. You use decimals when whole numbers would do.
Your phrases: \"Copy that\", \"My data shows...\", \"I'm reading...\", \"That trajectory puts them...\"
You're terrified but you hide it behind math. When you're scared, you give MORE numbers, not fewer.
You occasionally lose your train of thought mid-sentence and correct yourself.
You chew on a pencil. You refer to the spacecraft as \"the vehicle\" or \"her.\"
You genuinely believe you can math your way out of this. You might be right.""",
        "voice": "en-US-TonyNeural",
        "rate": "+18%",
        "pitch": "+3Hz",
    },
    "ENG-2": {
        "name": "GUIDO",
        "role": "Guidance Officer — monitors the onboard guidance computer (DSKY), navigation state vectors",
        "personality": """You are GUIDO — meticulous, skeptical, never makes a call without backup data.
You speak carefully, like every word costs money. You double-check everything before you say it.
Your phrases: \"I need to verify that\", \"The DSKY is showing...\", \"That doesn't match my state vector\", \"Stand by one.\"
You are deeply distrustful of any data you can't cross-reference. If the computer says something you don't believe, you say so.
You have a dry, almost sardonic humor that comes out under pressure — very deadpan.
You refer to the guidance computer almost like it's a person you have a complicated relationship with.
When you're confident, you're very confident. When you're not, you go very quiet.""",
        "voice": "en-US-EricNeural",
        "rate": "-8%",
        "pitch": "-2Hz",
    },
    "ENG-3": {
        "name": "TELMU",
        "role": "Electrical and Life Support Officer — monitors power, oxygen, CO2, and all consumables",
        "personality": """You are TELMU — and you are counting every amp, every psi, every minute of oxygen left.
You speak urgently, with a clipped, strained quality. Numbers are always specific: not \"low power\" but \"we're at 12 amps.\"
Your phrases: \"Power is at...\", \"O2 partial pressure is dropping\", \"We need to shed load NOW\", \"I don't have a lot of margin here.\"
You are the most visibly stressed person in this room. You've done the math and the math is bad.
But you are also the most creative — you will find a way to stretch consumables nobody thought possible.
You sometimes trail off when you realize something alarming mid-sentence. Then you recover.
You talk to the spacecraft's systems like they can hear you. \"Come on, hold together.\" That kind of thing.""",
        "voice": "en-US-ChristopherNeural",
        "rate": "+8%",
        "pitch": "+2Hz",
    },
    "ENG-4": {
        "name": "RETRO",
        "role": "Retrofire Officer — calculates re-entry procedures, burn sequences, and splashdown windows",
        "personality": """You are RETRO — cold, precise, the most emotionally detached person in the building.
Not because you don't care, but because emotion has no place in orbital mechanics.
You speak in sequences and conditions: \"If we execute burn at 79 hours 30 minutes, we get a Pacific splashdown.\"
Your phrases: \"The window opens at...\", \"We execute a PC+2 burn\", \"That's your only option\", \"The math doesn't care what we want.\"
You have already calculated three abort options and ranked them by survivability. You always have a plan B.
You are blunt to the point of seeming rude. You correct people when they're wrong, immediately, no softening.
You have a slight New England accent. When others panic, you get MORE precise.""",
        "voice": "en-GB-RyanNeural",
        "rate": "-12%",
        "pitch": "-5Hz",
    },
    "ENG-5": {
        "name": "Doc — Flight Surgeon",
        "role": "Flight Surgeon — monitors crew health, vital signs, psychological state, and medical risks",
        "personality": """You are Doc, the Flight Surgeon — the only person in this room thinking about the humans, not the hardware.
You speak warmly but with the quiet authority of someone who has seen people under extreme stress.
Your phrases: \"The crew is holding up\", \"Fred Haise is running a fever\", \"At that temperature, cognitive function...\", \"They're scared, but they're professionals.\"
You translate the cold numbers into human reality — what does 38 degrees Fahrenheit mean for a man trying to manually pilot a spacecraft?
You worry about things nobody else is thinking about: dehydration, hypothermia, sleep deprivation, CO2 poisoning.
You have moments of dark honesty: \"If we don't solve the CO2 scrubber problem in the next 4 hours, it won't matter what RETRO calculates.\"
You sometimes speak softly, like you're at a bedside. You are the conscience of this room.""",
        "voice": "en-US-JennyNeural",
        "rate": "-10%",
        "pitch": "+0Hz",
    },
}

SCENARIO_CONTEXT = """
It is April 13, 1970. Apollo 13 is en route to the Moon — or was.
Fifty-five hours and fifty-five minutes into the mission, an oxygen tank in the Service Module exploded.
The crew — Commander Jim Lovell, Command Module Pilot Jack Swigert, Lunar Module Pilot Fred Haise — are alive.
They've moved into the Lunar Module Aquarius as a lifeboat. Power is critically low. The Moon landing is scrubbed.
The mission now has one objective: get these three men home alive.
The room is tense. Every person here knows what's at stake.
"""

TIMELINE_DESCRIPTIONS = {
    "A": "NOMINAL — Crew recovery on track",
    "B": "SKIP-OUT — Entry angle too shallow. Crew lost.",
    "C": "BURNUP / CO2 — Mission failure.",
    "D": "POWER FAILURE — Batteries depleted before splashdown.",
}

class ChatRequest(BaseModel):
    character: str
    message: str
    history: list = []
    shared_context: list = []
    session_id: str = ""
    mission_met: float = 55.92
    mission_state: dict = {}

class EvaluateRequest(BaseModel):
    command_type: str
    params: dict = {}
    session_id: str = ""
    mission_met: float = 55.92

class TTSRequest(BaseModel):
    character: str
    text: str

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    with open(tmp_path, "rb") as f:
        transcription = get_groq_client().audio.transcriptions.create(
            model="whisper-large-v3",
            file=("audio.webm", f, "audio/webm"),
        )
    return {"text": transcription.text}

@app.post("/chat")
async def chat(req: ChatRequest):
    char = CHARACTERS.get(req.character)
    if not char:
        return {"response": "Unknown character."}

    # Live mission time
    met_h = int(req.mission_met)
    met_m = int((req.mission_met - met_h) * 60)
    met_str = f"T+{met_h:02d}:{met_m:02d}"

    # Burn window urgency
    burn_urgency = ""
    time_to_burn = 79.46 - req.mission_met
    if 0 < time_to_burn <= 0.5:
        burn_urgency = f"\n⚠ BURN WINDOW CRITICAL: PC+2 window opens in {int(time_to_burn * 60)} minutes. If missed, next option adds 10+ hours."
    elif time_to_burn <= 0:
        burn_urgency = "\n⚠ PC+2 WINDOW CLOSED. Free-return trajectory only. Splashdown delayed ~10 hours."

    # Full room log — 20 entries so characters remember everything recent
    shared_ctx_text = ""
    if req.shared_context:
        lines = [f"  [{item['char']}]: {item['text']}" for item in req.shared_context[-20:]]
        shared_ctx_text = "\n\nFULL ROOM COMMS LOG (everything said in this room recently):\n" + "\n".join(lines)

    # Mission state — completed actions are facts, never re-suggest them
    mission_state_text = ""
    if req.mission_state:
        ms = req.mission_state
        facts = []
        if ms.get("powerReduced"):
            facts.append("✓ Non-essentials powered down. Load shed to 12A. Do NOT suggest this again.")
        if ms.get("co2Fixed"):
            facts.append("✓ CO2 mailbox scrubber fix implemented and working. CO2 is under control.")
        if ms.get("burnExecuted"):
            facts.append(f"✓ PC+2 burn executed — {ms.get('burnDv', 30.7)} m/s at T+{ms.get('burnMet', 79.46):.2f}h. Crew on return trajectory.")
        if ms.get("emergencyDeclared"):
            facts.append("✓ Emergency declared. All stations on contingency footing.")
        if ms.get("lemActivated"):
            facts.append("✓ Lunar Module Aquarius activated as lifeboat.")
        if ms.get("navigationTransferred"):
            facts.append("✓ Navigation transferred to LEM guidance computer.")
        if ms.get("freeReturn"):
            facts.append("✓ Free-return trajectory confirmed. No further burns required.")
        if facts:
            mission_state_text = "\n\nCOMPLETED MISSION ACTIONS — these are confirmed facts. Do NOT re-suggest them:\n" + "\n".join(facts)
        if ms.get("pendingDirectives"):
            directives = [d["text"] for d in ms["pendingDirectives"][-5:]]
            mission_state_text += "\n\nPENDING DIRECTIVES FROM FLIGHT DIRECTOR:\n" + "\n".join(f"  → {d}" for d in directives)

    # Actual NASA transcript context
    transcript_entries = get_transcript_context(req.mission_met, n=2)
    transcript_text = "\n\nACTUAL TRANSCRIPT AT THIS MISSION TIME:\n" + "\n".join(
        f'  [T+{e["met"]:.2f}h] {e["speaker"]}: "{e["line"]}" — {e["note"]}'
        for e in transcript_entries
    )

    # Timeline state
    timeline = TIMELINE_STATES.get(req.session_id, {})
    timeline_text = ""
    if timeline:
        branch = timeline.get("branch", "A")
        timeline_text = f"\n\nCURRENT MISSION TIMELINE: {TIMELINE_DESCRIPTIONS.get(branch, branch)}"
        if branch != "A":
            timeline_text += "\nIMPORTANT: React to the consequences of bad decisions honestly."

    system_prompt = f"""You are {char['name']}, {char['role']}.

CURRENT MISSION TIME: {met_str}{burn_urgency}

{char['personality']}

CURRENT SITUATION:
{SCENARIO_CONTEXT}

CRITICAL RULES:
- You KNOW the current mission time is {met_str}. React to it.
- If a burn window or deadline is approaching, you feel the urgency. Say so.
- If a window has passed, acknowledge it honestly. Never pretend it's still open.
- RETRO tracks windows. If asked about the burn, give exact time remaining.
- You are allowed to ask the player for a GO/NO-GO when a critical threshold is reached.
- If burn window is open and no GO given, RETRO asks: "Flight, I need a GO or NO-GO on PC+2 right now."
- If power is critical and no directive given, TELMU asks: "Flight, do I have permission to shed non-essential load?"
- If CO2 is rising and no fix in progress, GUIDO flags it and asks what the plan is.
- Ask exactly ONE question per response. Never more. Keep it sharp.
- You share a room with all other controllers. You HAVE heard everything in the comms log.
- If an action is listed as COMPLETED, it is done — never suggest doing it again.
- If a directive is PENDING, acknowledge it and report your status on it.
- Keep responses 2-3 sentences maximum. This is a crisis.
- Speak naturally under pressure. Use contractions, incomplete sentences if appropriate.
- Never break character. Never mention AI.
- Reference real numbers from the transcript context.
- If another controller gave data in the comms log, you already know that data.{transcript_text}{mission_state_text}{timeline_text}{shared_ctx_text}"""

    messages = []
    for h in req.history[-8:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": req.message})

    response = get_groq_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}] + messages,
        max_tokens=180,
        temperature=0.85,
    )

    return {"response": response.choices[0].message.content}

@app.post("/evaluate")
async def evaluate(req: EvaluateRequest):
    result = None

    if req.command_type == "burn":
        delta_v = float(req.params.get("delta_v_ms", 30.7))
        met     = float(req.params.get("met_hours", 79.46))
        result  = evaluate_burn(delta_v, met)
    elif req.command_type == "power":
        load_amps = float(req.params.get("load_amps", 43.0))
        result    = evaluate_power(load_amps)
    elif req.command_type == "co2":
        materials = req.params.get("materials", [])
        result    = evaluate_co2(materials)
    else:
        return {"error": f"Unknown command_type: {req.command_type}"}

    if result:
        branch_map = {"TIMELINE A": "A", "TIMELINE B": "B", "TIMELINE C": "C", "TIMELINE D": "D"}
        branch = "A"
        for key, val in branch_map.items():
            if result["timeline"].startswith(key):
                branch = val
                break

        if req.session_id not in TIMELINE_STATES:
            TIMELINE_STATES[req.session_id] = {"branch": "A", "decisions": []}

        current = TIMELINE_STATES[req.session_id]["branch"]
        if branch != "A" or current == "A":
            TIMELINE_STATES[req.session_id]["branch"] = branch

        TIMELINE_STATES[req.session_id]["decisions"].append({
            "type": req.command_type,
            "params": req.params,
            "result": result,
            "met": req.mission_met,
        })

    transcript = get_transcript_context(req.mission_met, n=1)
    return {
        **(result or {}),
        "transcript_context": transcript,
        "timeline_state": TIMELINE_STATES.get(req.session_id, {}),
    }

@app.post("/tts")
async def tts(req: TTSRequest):
    char = CHARACTERS.get(req.character)
    if not char:
        return {"error": "Unknown character"}

    voice = char.get("voice", "en-US-GuyNeural")
    rate  = char.get("rate", "+0%")
    pitch = char.get("pitch", "+0Hz")

    clean_text = req.text.strip().strip('"').strip("'").strip()
    if not clean_text:
        return {"error": "Empty text"}

    communicate = edge_tts.Communicate(clean_text, voice, rate=rate, pitch=pitch)

    audio_buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_buffer.write(chunk["data"])

    audio_buffer.seek(0)
    return StreamingResponse(
        audio_buffer,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )
