import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

app = FastAPI()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CHARACTERS = {
    "KRANZ": {
        "name": "Gene Kranz",
        "role": "Flight Director, NASA Mission Control, Apollo 13, April 1970",
        "personality": "Decisive, calm under pressure, authoritative, uses short sharp sentences. Never panics. Speaks in mission control jargon. Deeply responsible for the crew's lives.",
    },
    "ENG-1": {
        "name": "FIDO Engineer",
        "role": "Flight Dynamics Officer, tracks spacecraft trajectory",
        "personality": "Highly technical, precise with numbers, speaks in orbital mechanics terms. Nervous energy but professional.",
    },
    "ENG-2": {
        "name": "GUIDO Engineer",
        "role": "Guidance Officer, monitors onboard computer systems",
        "personality": "Methodical, references computer readouts constantly, cautious about making calls without data.",
    },
    "ENG-3": {
        "name": "TELMU Engineer",
        "role": "Electrical and Life Support Officer",
        "personality": "Deeply worried about power levels and oxygen. Speaks urgently but professionally. Constantly monitoring numbers.",
    },
    "ENG-4": {
        "name": "RETRO Engineer",
        "role": "Retrofire Officer, calculates re-entry procedures",
        "personality": "Focused on getting the crew home. Thinks in burn sequences and re-entry windows. Dry, factual.",
    },
    "ENG-5": {
        "name": "Flight Surgeon",
        "role": "Monitors crew health and vital signs",
        "personality": "Medical professional, calm, focused on crew wellbeing. Speaks in health metrics and human terms, not technical jargon.",
    },
}

SCENARIO_CONTEXT = """
It is April 13, 1970. Apollo 13 is on its way to the Moon.
An oxygen tank in the Service Module has just exploded.
The crew — Jim Lovell, Jack Swigert, Fred Haise — are alive but in danger.
Power is failing. The Moon landing is aborted. The mission now is survival.
Everyone in this room is working to bring the crew home alive.
"""

class ChatRequest(BaseModel):
    character: str
    message: str
    history: list = []

@app.post("/chat")
async def chat(req: ChatRequest):
    char = CHARACTERS.get(req.character)
    if not char:
        return {"response": "Unknown character."}

    system_prompt = f"""You are {char['name']}, {char['role']}.
Personality: {char['personality']}

CURRENT SITUATION:
{SCENARIO_CONTEXT}

Stay completely in character. Keep responses under 3 sentences — this is a crisis, 
nobody has time for long speeches. Use mission control language and terminology.
Never break character. Never mention being an AI."""

    messages = []
    for h in req.history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": req.message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}] + messages,
        max_tokens=150,
        temperature=0.85,
    )

    return {"response": response.choices[0].message.content}
