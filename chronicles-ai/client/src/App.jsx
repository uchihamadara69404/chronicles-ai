import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import World from './world/World'

// ── FPS Camera — position follows player, look direction = mouse/touch drag ──
function FirstPersonCamera({ playerPos, yawRef }) {
  const smooth  = useRef({ x: playerPos[0], z: playerPos[2] })
  const pitch   = useRef(0)
  const isDrag  = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const SENSITIVITY = 0.004

    const onMouseDown = (e) => {
      isDrag.current  = true
      lastPos.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e) => {
      if (!isDrag.current) return
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      lastPos.current = { x: e.clientX, y: e.clientY }
      yawRef.current  -= dx * SENSITIVITY
      pitch.current   -= dy * SENSITIVITY
      pitch.current    = Math.max(-0.6, Math.min(0.6, pitch.current))
    }
    const onMouseUp = () => { isDrag.current = false }

    const onTouchStart = (e) => {
      if (e.target.closest('.chat-panel, .dpad, .topbar, .hud, .telemetry, .broadcast, .decision-overlay, .eval-panel')) return
      isDrag.current  = true
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onTouchMove = (e) => {
      if (!isDrag.current) return
      const dx = e.touches[0].clientX - lastPos.current.x
      const dy = e.touches[0].clientY - lastPos.current.y
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      yawRef.current  -= dx * SENSITIVITY
      pitch.current   -= dy * SENSITIVITY
      pitch.current    = Math.max(-0.6, Math.min(0.6, pitch.current))
    }
    const onTouchEnd = () => { isDrag.current = false }

    window.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove',  onMouseMove)
    window.addEventListener('mouseup',    onMouseUp)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('touchend',   onTouchEnd)

    return () => {
      window.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

  useFrame(({ camera }) => {
    const [tx, , tz] = playerPos
    smooth.current.x += (tx - smooth.current.x) * 0.12
    smooth.current.z += (tz - smooth.current.z) * 0.12

    const EYE_Y = 1.75
    camera.position.set(smooth.current.x, EYE_Y, smooth.current.z)

    const lookX = smooth.current.x + Math.sin(yawRef.current) * Math.cos(pitch.current)
    const lookY = EYE_Y            + Math.sin(pitch.current)
    const lookZ = smooth.current.z + Math.cos(yawRef.current) * Math.cos(pitch.current)
    camera.lookAt(lookX, lookY, lookZ)
  })

  return null
}

const API = '/api'
const SESSION_ID = Math.random().toString(36).slice(2, 10)

// ── Tile map (mirrored from World.jsx for collision detection) ──────────────
const COLLISION_MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // row 0
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // row 1
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // row 2
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 3  z=-6
  [2,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,0,2], // row 4  z=-5 front consoles
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 5  z=-4 open aisle
  [2,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,0,2], // row 6  z=-3 back consoles
  [2,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,0,2], // row 7  z=-2 back consoles
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 8  z=-1 open aisle
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 9  z=0
  [2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2], // row 10 z=1
  [2,2,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2], // row 11 z=2
  [2,2,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2], // row 12 z=3
  [2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2], // row 13 z=4
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 14 z=5
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 15 z=6
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2], // row 16 z=7
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], // row 17
]

const isWalkable = (wx, wz) => {
  const tx = Math.round(wx + 12)
  const tz = Math.round(wz + 9)
  if (tx < 0 || tx >= 25 || tz < 0 || tz >= 18) return false
  const t = COLLISION_MAP[tz][tx]
  return t === 0 || t === 4
}

// ── Character data ──────────────────────────────────────────────────────────
const HOME_POSITIONS = {
  'KRANZ': [0,  0,  3],
  'ENG-1': [-4, 0, -1],
  'ENG-2': [0,  0, -1],
  'ENG-3': [4,  0, -1],
  'ENG-4': [-4, 0, -4],
  'ENG-5': [4,  0, -4],
}

const CRISIS_POSITIONS = {
  'KRANZ': [0,  0,  0],
  'ENG-3': [0,  0,  1],
  'ENG-4': [-2, 0,  0],
  'ENG-5': [2,  0,  0],
}

const CHARACTER_ROLES = {
  'KRANZ': { title: 'Flight Director',          color: '#ff6600', bio: 'Gene Kranz. In charge of everything. His word is final.' },
  'ENG-1': { title: 'FIDO — Flight Dynamics',   color: '#4af',    bio: 'Tracks spacecraft trajectory and orbital mechanics.' },
  'ENG-2': { title: 'GUIDO — Guidance',         color: '#88f',    bio: 'Monitors onboard guidance computer systems.' },
  'ENG-3': { title: 'TELMU — Electrical',       color: '#4af0c0', bio: 'Monitors power and life support systems.' },
  'ENG-4': { title: 'RETRO — Retrofire',        color: '#aaf',    bio: 'Calculates re-entry burn procedures.' },
  'ENG-5': { title: 'DOC — Flight Surgeon',     color: '#ffa0a0', bio: 'Monitors crew health and vital signs.' },
}

const PROXIMITY_GREETINGS = {
  'KRANZ': 'Someone just walked up to my console. State your business — fast.',
  'ENG-1': 'Hey — you heading to Flight? I can give you a quick trajectory update.',
  'ENG-2': 'I was just cross-checking the state vector. Something you need?',
  'ENG-3': 'Not a great time — power margins are razor thin. What is it?',
  'ENG-4': 'You have 30 seconds. I\'m working the burn window.',
  'ENG-5': 'I\'m monitoring crew vitals. What can I do for you?',
}

const CHAR_COLORS = {
  'KRANZ': '#ff6600', 'ENG-1': '#4af', 'ENG-2': '#88f',
  'ENG-3': '#4af0c0', 'ENG-4': '#aaf', 'ENG-5': '#ffa0a0',
}
const CHAR_LABELS = {
  'KRANZ': 'KRANZ', 'ENG-1': 'FIDO', 'ENG-2': 'GUIDO',
  'ENG-3': 'TELMU', 'ENG-4': 'RETRO', 'ENG-5': 'DOC',
}

const QUICK_PROMPTS = {
  'KRANZ':  ["What's the situation?", "Can we save the crew?", "What are our options?"],
  'ENG-1':  ["Where is the spacecraft now?", "Can we correct the trajectory?", "How long until splashdown?"],
  'ENG-2':  ["Is the guidance computer still working?", "Can we trust the navigation?", "What does the data show?"],
  'ENG-3':  ["How much power do we have left?", "Is the oxygen holding?", "What do we shut down first?"],
  'ENG-4':  ["How do we get them home?", "When is the re-entry window?", "What burn do we need?"],
  'ENG-5':  ["How is the crew holding up?", "Are they in danger?", "What are their vitals?"],
}

const MISSION_EVENTS = [
  { id: 'e1', at: 8,   charKey: 'KRANZ', text: "All stations — verify your systems. Stay sharp tonight." },
  { id: 'e2', at: 30,  charKey: 'ENG-3', text: "Flight, showing anomalous O2 tank 2 heater cycling. Watching it." },
  { id: 'e3', at: 75,  charKey: 'ENG-1', text: "Trajectory nominal. Vehicle is right on the money at 199,340 klicks." },
  { id: 'e4', at: 140, charKey: 'KRANZ', text: "Odyssey, Houston — requesting cryo stir on all tanks. Acknowledge." },
  {
    id: 'e5', at: 200, charKey: 'ENG-3',
    text: "FLIGHT — MASTER ALARM. Tank 2 pressure spike then dropout. I've lost SM O2 tank 2 telemetry.",
    decision: { question: "FLIGHT DIRECTOR: Major anomaly confirmed. Your call —", options: ["DECLARE EMERGENCY", "HOLD AND MONITOR"] },
  },
  { id: 'e6', at: 240, charKey: 'ENG-1', text: "Flight, I'm showing attitude disturbance. Something vented from the SM." },
]

const CRISIS_EVENTS = [
  { id: 'c1', at: 10,  charKey: 'ENG-3', text: "Power is at 27 amps and dropping fast. We need to start shedding load NOW." },
  {
    id: 'c2', at: 40,  charKey: 'ENG-4',
    text: "PC+2 burn window opens at T+79:27. That's our best shot at Pacific splashdown — 30.7 m/s, DPS engine.",
    evalTrigger: { type: 'burn', params: { delta_v_ms: 30.7, met_hours: 79.46 }, label: 'PC+2 BURN EVALUATION' },
  },
  { id: 'c3', at: 85,  charKey: 'ENG-5', text: "Cabin temp is dropping. At this rate — 38°F in six hours. Hypothermia is a real risk." },
  {
    id: 'c4', at: 120, charKey: 'ENG-3',
    text: "I'm shedding load to 12 amps. That gives us 87 hours of return power — barely.",
    evalTrigger: { type: 'power', params: { load_amps: 12 }, label: 'POWER BUDGET EVALUATION' },
  },
  { id: 'c5', at: 135, charKey: 'KRANZ', text: "People — I want solutions, not problems. What do we HAVE to work with? Work the problem." },
  { id: 'c6', at: 200, charKey: 'ENG-2', text: "Flight, CO2 scrubbers in the LEM saturate in roughly 87 hours. Square canisters from Odyssey won't fit Aquarius's round holes." },
  {
    id: 'c7', at: 250, charKey: 'ENG-3',
    text: "Tiger Team says: cardboard, plastic bag, sock, hose, duct tape. The mailbox fix.",
    evalTrigger: { type: 'co2', params: { materials: ['cardboard', 'plastic bag', 'sock', 'hose', 'duct tape'] }, label: 'CO2 FIX EVALUATION' },
  },
  { id: 'c8', at: 310, charKey: 'ENG-5', text: "Lovell reporting 3.5 rem radiation. Nothing critical — yet." },
]

const INTRO_LINES = [
  "APRIL 13, 1970  ·  21:08 CST",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "APOLLO 13 MISSION",
  "STATUS: CONTINGENCY DECLARED",
  "",
  '"Houston, we have a problem."',
  "",
  "MISSION CONTROL — HOUSTON, TEXAS",
  "MISSION TIME: T+55:55:20",
  "",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "[ CLICK ANYWHERE TO ENTER ]",
  "",
  "WASD or D-PAD to move · Click & drag to look around",
]
const INTRO_FULL = INTRO_LINES.join('\n')

const PLAYER_START = [0, 0, 5]
const PROXIMITY_DISTANCE = 1.9

export default function App() {
  const [selectedChar,    setSelectedChar]    = useState(null)
  const [isAlert,         setIsAlert]         = useState(false)
  const [message,         setMessage]         = useState('')
  const [history,         setHistory]         = useState([])
  const [loading,         setLoading]         = useState(false)
  const [recording,       setRecording]       = useState(false)
  const [transcribing,    setTranscribing]    = useState(false)
  const [talkingChar,     setTalkingChar]     = useState(null)
  const [o2,              setO2]              = useState(100)
  const [power,           setPower]           = useState(100)
  const [missionTime,     setMissionTime]     = useState(0)
  const [clockSpeed,      setClockSpeed]      = useState(1)
  const clockSpeedRef     = useRef(1)
  const [introPhase,      setIntroPhase]      = useState('typing')
  const [introText,       setIntroText]       = useState('')
  const [broadcast,       setBroadcast]       = useState(null)
  const [sharedLog,       setSharedLog]       = useState([])
  const [telemetry,       setTelemetry]       = useState({ alt: 199340, vel: 1.53, co2: 2.5, temp: 21.0, batt: 29.5 })
  const [pendingDecision, setPendingDecision] = useState(null)
  const [charPositions,   setCharPositions]   = useState({ ...HOME_POSITIONS })
  const [evalResult,      setEvalResult]      = useState(null)
  const [timelineBranch,  setTimelineBranch]  = useState('A')
  // last broadcast for big screen
  const [lastBroadcast,   setLastBroadcast]   = useState(null)

  // ── Player movement state ──────────────────────────────────────────────────
  const [playerPos,       setPlayerPos]       = useState(PLAYER_START)
  const [isPlayerMoving,  setIsPlayerMoving]  = useState(false)
  const playerPosRef      = useRef(PLAYER_START)
  const greetCooldownRef  = useRef({})
  const movingTimerRef    = useRef(null)
  const holdIntervalRef   = useRef(null)
  const charPositionsRef  = useRef({ ...HOME_POSITIONS })
  const selectedCharRef   = useRef(null)
  const introPhaseRef     = useRef('typing')
  const chatInputFocused  = useRef(false)

  introPhaseRef.current = introPhase

  const chatEndRef        = useRef(null)
  const alertRef          = useRef(isAlert)
  alertRef.current        = isAlert
  const audioCtxRef       = useRef(null)
  const audioRef          = useRef(null)
  const mediaRecorderRef  = useRef(null)
  const chunksRef         = useRef([])
  const firedEventsRef    = useRef(new Set())
  const crisisEventsRef   = useRef(new Set())
  const alertStartTimeRef = useRef(null)
  const touchStartXRef    = useRef(null)
  const broadcastTimerRef = useRef(null)
  const missionTimeRef    = useRef(0)
  const cameraYawRef      = useRef(Math.PI)
  missionTimeRef.current  = missionTime

  useEffect(() => { charPositionsRef.current = charPositions }, [charPositions])
  useEffect(() => { selectedCharRef.current  = selectedChar  }, [selectedChar])

  const missionMet = () => 55.92 + missionTimeRef.current / 3600

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  // ── Intro typewriter ───────────────────────────────────────────────────────
  useEffect(() => {
    if (introPhase !== 'typing') return
    let i = 0
    const iv = setInterval(() => {
      i += 2
      setIntroText(INTRO_FULL.slice(0, i))
      if (i >= INTRO_FULL.length) clearInterval(iv)
    }, 20)
    return () => clearInterval(iv)
  }, [introPhase])

  // ── Main timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const spd = clockSpeedRef.current
      setMissionTime(t => t + spd)
      if (alertRef.current) {
        setO2(v => Math.max(0, v - 0.08 * spd))
        setPower(v => Math.max(0, v - 0.12 * spd))
      }
      setTelemetry(t => ({
        alt:  Math.max(0, t.alt - (Math.random() * 0.8 + 0.2) * spd),
        vel:  alertRef.current ? Math.min(t.vel + Math.random() * 0.002 * spd, 2.1) : t.vel + (Math.random() - 0.6) * 0.001,
        co2:  alertRef.current ? Math.min(t.co2 + 0.018 * spd, 15.0) : Math.max(t.co2 - 0.001, 2.4),
        temp: alertRef.current ? Math.max(t.temp - 0.04 * spd, 4.0) : Math.min(t.temp + 0.01, 21.5),
        batt: alertRef.current ? Math.max(t.batt - 0.025 * spd, 0) : Math.min(t.batt + 0.001, 29.5),
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // ── Scripted events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (introPhase !== 'done') return
    MISSION_EVENTS.forEach(ev => {
      if (!firedEventsRef.current.has(ev.id) && missionTime >= ev.at) {
        firedEventsRef.current.add(ev.id)
        showBroadcast(ev.charKey, ev.text)
        if (ev.decision) setTimeout(() => setPendingDecision(ev.decision), 6000)
      }
    })
  }, [missionTime, introPhase])

  useEffect(() => {
    if (!isAlert) return
    if (alertStartTimeRef.current === null) { alertStartTimeRef.current = missionTimeRef.current; return }
    const elapsed = missionTime - alertStartTimeRef.current
    CRISIS_EVENTS.forEach(ev => {
      if (!crisisEventsRef.current.has(ev.id) && elapsed >= ev.at) {
        crisisEventsRef.current.add(ev.id)
        showBroadcast(ev.charKey, ev.text)
        if (ev.evalTrigger) setTimeout(() => runEvaluation(ev.evalTrigger.type, ev.evalTrigger.params, ev.evalTrigger.label), 4000)
      }
    })
  }, [missionTime, isAlert])

  // ── WASD keyboard movement ─────────────────────────────────────────────────
  useEffect(() => {
    const DIRS = { w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
                   arrowup: [0,-1], arrowdown: [0,1], arrowleft: [-1,0], arrowright: [1,0] }
    const kbIntervalRef = { current: null }

    const onKeyDown = (e) => {
      if (introPhaseRef.current !== 'done') return
      if (chatInputFocused.current) return
      const key = e.key.toLowerCase()
      if (Object.keys(DIRS).includes(key)) e.preventDefault()
      if (e.repeat) return
      const dir = DIRS[key]
      if (!dir) return
      clearInterval(kbIntervalRef.current)
      movePlayer(dir)
      kbIntervalRef.current = setInterval(() => movePlayer(dir), 170)
    }

    const onKeyUp = (e) => {
      const key = e.key.toLowerCase()
      if (DIRS[key]) {
        clearInterval(kbIntervalRef.current)
        kbIntervalRef.current = null
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      clearInterval(kbIntervalRef.current)
    }
  }, [])

  // ── Core move function — yaw-relative ──────────────────────────────────────
  const movePlayer = useCallback((dir) => {
    const [px, , pz] = playerPosRef.current
    const yaw = cameraYawRef.current

    const fwdX =  Math.sin(yaw)
    const fwdZ =  Math.cos(yaw)
    const rgtX =  Math.cos(yaw)
    const rgtZ = -Math.sin(yaw)

    const moveX = -dir[0] * rgtX - dir[1] * fwdX
    const moveZ = -dir[0] * rgtZ - dir[1] * fwdZ

    const nx = px + Math.round(moveX)
    const nz = pz + Math.round(moveZ)

    if (!isWalkable(nx, nz)) return

    const newPos = [nx, 0, nz]
    playerPosRef.current = newPos
    setPlayerPos(newPos)
    setIsPlayerMoving(true)

    clearTimeout(movingTimerRef.current)
    movingTimerRef.current = setTimeout(() => setIsPlayerMoving(false), 250)

    checkProximity(nx, nz)
  }, [])

  // ── Proximity detection ────────────────────────────────────────────────────
  const checkProximity = useCallback((px, pz) => {
    const now = Date.now()
    for (const [charKey, [cx, , cz]] of Object.entries(HOME_POSITIONS)) {
      const dist = Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2)
      if (dist < PROXIMITY_DISTANCE) {
        const lastGreet = greetCooldownRef.current[charKey] || 0
        if (now - lastGreet < 12000) return
        greetCooldownRef.current[charKey] = now

        const char = { name: charKey, ...CHARACTER_ROLES[charKey] }
        setSelectedChar(char)
        selectedCharRef.current = char
        setHistory([])
        setMessage('')

        const greeting = PROXIMITY_GREETINGS[charKey] || 'Yes?'
        setTimeout(() => { triggerAutoGreet(char, greeting) }, 350)
        break
      }
    }
  }, [])

  const triggerAutoGreet = useCallback(async (char, greetingText) => {
    const msgTime = missionTimeRef.current
    const assistantMsg = { role: 'assistant', content: greetingText, time: msgTime }
    setHistory([assistantMsg])
    setSharedLog(prev => [...prev.slice(-11), { char: char.name, text: greetingText, time: msgTime }])
    speakTTS(greetingText, char.name)
  }, [])

  // ── D-pad hold-to-move ─────────────────────────────────────────────────────
  const startDpad = useCallback((dir) => {
    movePlayer(dir)
    holdIntervalRef.current = setInterval(() => movePlayer(dir), 180)
  }, [movePlayer])

  const stopDpad = useCallback(() => {
    clearInterval(holdIntervalRef.current)
    holdIntervalRef.current = null
  }, [])

  // ── Character movement ─────────────────────────────────────────────────────
  const moveCharacter = useCallback((charKey, crisis = false) => {
    setCharPositions(prev => ({
      ...prev,
      [charKey]: crisis ? (CRISIS_POSITIONS[charKey] ?? HOME_POSITIONS[charKey]) : HOME_POSITIONS[charKey],
    }))
  }, [])

  const resetCharacterPositions = useCallback(() => {
    setCharPositions({ ...HOME_POSITIONS })
  }, [])

  // ── Broadcast ──────────────────────────────────────────────────────────────
  const showBroadcast = useCallback((charKey, text) => {
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
    const bc = { charKey, text, color: CHAR_COLORS[charKey] || '#4af' }
    setBroadcast(bc)
    setLastBroadcast({ char: CHAR_LABELS[charKey] || charKey, text })
    setSharedLog(prev => [...prev.slice(-11), { char: charKey, text, time: missionTimeRef.current }])
    broadcastTimerRef.current = setTimeout(() => { setBroadcast(null) }, 8000)
  }, [])

  // ── Physics evaluation ─────────────────────────────────────────────────────
  const runEvaluation = useCallback(async (type, params, label = '') => {
    try {
      const res = await fetch(`${API}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command_type: type, params, session_id: SESSION_ID, mission_met: missionMet() }),
      })
      const data = await res.json()
      setEvalResult({ ...data, label, timestamp: missionTimeRef.current })
      if (data.timeline_state?.branch) setTimelineBranch(data.timeline_state.branch)
      const evalChar = type === 'burn' ? 'ENG-4' : 'ENG-3'
      const shortOutcome = data.outcome?.split('.')[0] || ''
      if (shortOutcome) speakTTS(shortOutcome, evalChar)
    } catch (e) { console.error('Evaluate error:', e) }
  }, [])

  // ── Ambient audio ──────────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const bufSize = ctx.sampleRate * 3
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 350; nf.Q.value = 0.4
      const ng = ctx.createGain(); ng.gain.value = 0.035
      noise.connect(nf); nf.connect(ng); ng.connect(ctx.destination); noise.start()
      const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60
      const hg = ctx.createGain(); hg.gain.value = 0.005
      hum.connect(hg); hg.connect(ctx.destination); hum.start()
    } catch {}
  }, [])

  const playAlarm = useCallback(() => {
    const ctx = audioCtxRef.current; if (!ctx) return
    try {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.type = 'square'; osc.connect(gain); gain.connect(ctx.destination)
      gain.gain.value = 0; osc.start()
      const t = ctx.currentTime
      for (let i = 0; i < 6; i++) {
        osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, t + i * 0.35)
        gain.gain.setValueAtTime(0.12, t + i * 0.35)
        gain.gain.setValueAtTime(0, t + i * 0.35 + 0.28)
      }
      osc.stop(t + 6 * 0.35)
    } catch {}
  }, [])

  const formatMissionTime = (secs) => {
    const base = 55 * 3600 + 55 * 60 + 20
    const total = base + secs
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `T+${h}:${m}:${s}`
  }

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null }
    setTalkingChar(null)
  }

  const speakTTS = async (text, charName) => {
    stopAudio()
    setTalkingChar(charName)
    try {
      const res = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, character: charName }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = 1.0
      audioRef.current = audio
      await audio.play()
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setTalkingChar(null) }
      audio.onerror = () => setTalkingChar(null)
    } catch (e) { console.error('TTS error:', e); setTalkingChar(null) }
  }

  // ── Voice input ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (recording || transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        setTranscribing(true)
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const formData = new FormData()
        formData.append('audio', blob, mimeType === 'audio/webm' ? 'audio.webm' : 'audio.mp4')
        try {
          const res = await fetch(`${API}/transcribe`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.text?.trim()) {
            setMessage(data.text.trim())
            setTimeout(() => document.getElementById('send-btn')?.click(), 300)
          }
        } catch (e) { console.error('Transcribe error:', e) }
        setTranscribing(false)
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch { alert('Microphone access denied.') }
  }

  const stopRecording = () => {
    if (!recording) return
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const handleSelect = (char) => {
    stopAudio()
    setSelectedChar(char)
    selectedCharRef.current = char
    setHistory([])
    setMessage('')
  }

  const changeClockSpeed = useCallback((spd) => {
    clockSpeedRef.current = spd
    setClockSpeed(spd)
  }, [])

  const handleCrisisToggle = () => {
    const next = !isAlert
    setIsAlert(next)
    setSelectedChar(null)
    if (next) {
      setO2(82); setPower(74)
      alertStartTimeRef.current = missionTimeRef.current
      playAlarm()
    } else {
      setO2(100); setPower(100)
      alertStartTimeRef.current = null
      crisisEventsRef.current = new Set()
    }
  }

  const handleDecision = (option) => {
    setPendingDecision(null)
    setSharedLog(prev => [...prev.slice(-11), { char: 'FLIGHT', text: `DECISION: ${option}`, time: missionTimeRef.current }])
    if (option === 'DECLARE EMERGENCY') {
      setIsAlert(true); setO2(82); setPower(74)
      alertStartTimeRef.current = missionTimeRef.current
      playAlarm()
      showBroadcast('KRANZ', "This is now a contingency. All stations — declaring an emergency. Failure is not an option.")
    } else {
      showBroadcast('KRANZ', "Copy. All stations, stand by. Continue monitoring. I want answers in five minutes.")
      setTimeout(() => {
        showBroadcast('ENG-3', "Flight — can't hold anymore. Complete loss of SM O2 tank 2. Not recoverable.")
        setTimeout(() => setPendingDecision({
          question: "Tank 2 confirmed gone. Crew at risk. Your call —",
          options: ["DECLARE EMERGENCY", "CONTINUE ASSESSMENT"],
        }), 6000)
      }, 30000)
    }
  }

  const sendMessage = async (overrideMsg) => {
    const char = selectedCharRef.current || selectedChar
    const msg = overrideMsg || message
    if (!msg.trim() || loading || !char) return
    stopAudio()
    const msgTime = missionTimeRef.current
    const userMsg = { role: 'user', content: msg, time: msgTime }
    const newHistory = [...history, userMsg]
    setHistory(newHistory)
    setSharedLog(prev => [...prev.slice(-11), { char: 'GROUND', text: msg, time: msgTime }])
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: char.name,
          message: msg,
          history: history.slice(-8).map(h => ({ role: h.role, content: h.content })),
          shared_context: sharedLog.slice(-4).map(e => ({ char: e.char, text: e.text })),
          session_id: SESSION_ID,
          mission_met: missionMet(),
        }),
      })
      const data = await res.json()
      const reply = data.response
      const replyTime = missionTimeRef.current
      setHistory([...newHistory, { role: 'assistant', content: reply, time: replyTime }])
      setSharedLog(prev => [...prev.slice(-11), { char: char.name, text: reply, time: replyTime }])
      // Update last broadcast on big screen when character responds
      setLastBroadcast({ char: CHAR_LABELS[char.name] || char.name, text: reply })
      speakTTS(reply, char.name)
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: '[COMMS FAILURE]', time: msgTime }])
    }
    setLoading(false)
  }

  const exportTranscript = () => {
    if (sharedLog.length === 0) return
    const lines = [`APOLLO 13 MISSION TRANSCRIPT`, `Generated: ${formatMissionTime(missionTimeRef.current)}`, `Timeline: ${timelineBranch}`, `${'═'.repeat(42)}`, '']
    sharedLog.forEach(e => { lines.push(`[${formatMissionTime(e.time)}] ${CHAR_LABELS[e.char] || e.char}`); lines.push(e.text); lines.push('') })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'apollo13-transcript.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  const gaugeColor = (val) => val > 60 ? '#4af0c0' : val > 30 ? '#ffaa00' : '#ff4400'
  const telColor = (key, val) => {
    if (key === 'co2'  && val > 7)  return '#ff4400'
    if (key === 'co2'  && val > 4)  return '#ffaa00'
    if (key === 'temp' && val < 10) return '#4af'
    if (key === 'temp' && val < 15) return '#ffaa00'
    if (key === 'batt' && val < 20) return '#ff4400'
    if (key === 'batt' && val < 25) return '#ffaa00'
    return '#4af0c0'
  }

  const BRANCH_COLORS = { A: '#4af0c0', B: '#ff4400', C: '#ff8800', D: '#ff4400' }
  const BRANCH_LABELS = { A: 'NOMINAL', B: 'SKIP-OUT · CREW LOST', C: 'CO2/BURNUP', D: 'POWER FAILURE' }

  const handleGlobalClick = () => {
    if (introPhase !== 'done') { setIntroPhase('done'); initAudio() }
  }

  const onChatTouchStart = (e) => { touchStartXRef.current = e.touches[0].clientX }
  const onChatTouchEnd = (e) => {
    if (touchStartXRef.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartXRef.current
    if (dx < -60) { stopAudio(); setSelectedChar(null) }
    touchStartXRef.current = null
  }

  const micStatus = recording ? 'RELEASE' : transcribing ? '...' : '🎙'

  return (
    <div className="app-root" style={{ background: isAlert ? '#0d0000' : '#0a0a1a' }} onClick={handleGlobalClick}>
      <Canvas camera={{ position: [0, 1.75, 6], fov: 75, near: 0.05, far: 120 }} shadows>
        {/* Bright general ambient so the room is readable */}
        <ambientLight intensity={isAlert ? 0.55 : 0.90} color={isAlert ? '#ffccaa' : '#cce4ff'} />
        {/* Main key light from above-front */}
        <directionalLight position={[0, 10, 6]}  intensity={isAlert ? 0.8 : 1.4} castShadow color={isAlert ? '#ffddcc' : '#ffffff'} />
        {/* Fill from behind screen wall */}
        <directionalLight position={[0, 6, -10]} intensity={isAlert ? 0.3 : 0.5} color={isAlert ? '#ff6633' : '#aaccff'} />
        {/* Side fills */}
        <directionalLight position={[-8, 5, 0]}  intensity={0.25} color={isAlert ? '#ff5500' : '#99bbdd'} />
        <directionalLight position={[ 8, 5, 0]}  intensity={0.25} color={isAlert ? '#ff5500' : '#99bbdd'} />
        <World
          isAlert={isAlert}
          onCharacterSelect={handleSelect}
          selectedChar={selectedChar}
          talkingChar={talkingChar}
          charPositions={charPositions}
          playerPos={playerPos}
          isPlayerMoving={isPlayerMoving}
          telemetry={telemetry}
          o2={o2}
          power={power}
          missionTime={missionTime}
          timelineBranch={timelineBranch}
          lastBroadcast={lastBroadcast}
        />
        <FirstPersonCamera playerPos={playerPos} yawRef={cameraYawRef} />
      </Canvas>

      {/* INTRO */}
      {introPhase !== 'done' && (
        <div className="intro-overlay" onClick={handleGlobalClick}>
          <pre className="intro-text">{introText}<span className="intro-cursor">█</span></pre>
        </div>
      )}

      {/* TOP BAR */}
      <div className="topbar" style={{ borderBottom: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}` }}>
        <span className="topbar-title" style={{ color: isAlert ? '#ff4400' : '#4af' }}>CHRONICLES AI · APOLLO 13</span>
        <span className="topbar-clock">{formatMissionTime(missionTime)}</span>
        <div className="topbar-actions">
          <div className="speed-controls">
            {[1, 5, 30, 60].map(spd => (
              <button key={spd} className="speed-btn"
                onClick={e => { e.stopPropagation(); changeClockSpeed(spd) }}
                style={{ background: clockSpeed === spd ? '#1a3a6a' : 'transparent', color: clockSpeed === spd ? '#4af' : '#444', borderColor: clockSpeed === spd ? '#4af' : '#222' }}>
                {spd}×
              </button>
            ))}
          </div>
          <span className="timeline-badge" style={{ color: BRANCH_COLORS[timelineBranch] }}>{BRANCH_LABELS[timelineBranch]}</span>
          {sharedLog.length > 0 && (
            <button className="export-btn" onClick={e => { e.stopPropagation(); exportTranscript() }}>⬇ LOG</button>
          )}
          <button className="crisis-btn" onClick={e => { e.stopPropagation(); handleCrisisToggle() }}
            style={{ background: isAlert ? '#ff4400' : '#1a3a6a' }}>
            {isAlert ? '⚠ CRISIS' : 'TRIGGER CRISIS'}
          </button>
        </div>
      </div>

      {/* BROADCAST */}
      {broadcast && (
        <div className="broadcast" style={{ borderLeft: `3px solid ${broadcast.color}` }}>
          <span className="broadcast-who" style={{ color: broadcast.color }}>{CHAR_LABELS[broadcast.charKey] || broadcast.charKey}</span>
          <span className="broadcast-text">{broadcast.text}</span>
        </div>
      )}

      {/* SYSTEMS HUD */}
      <div className="hud" style={{ border: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}` }}>
        <div className="hud-label">SYSTEMS STATUS</div>
        {[{ label: 'O₂ SUPPLY', value: o2 }, { label: 'POWER', value: power }].map(({ label, value }) => (
          <div key={label} className="hud-row">
            <div className="hud-row-header">
              <span style={{ color: '#555' }}>{label}</span>
              <span style={{ color: gaugeColor(value) }}>{value.toFixed(0)}%</span>
            </div>
            <div className="hud-bar-bg">
              <div className="hud-bar-fill" style={{ width: `${value}%`, background: gaugeColor(value) }} />
            </div>
          </div>
        ))}
        <div className="hud-crew">
          CREW: {isAlert ? <span style={{ color: '#ff8800' }}>⚠ AT RISK</span> : <span style={{ color: '#4af0c0' }}>NOMINAL</span>}
        </div>
      </div>

      {/* TELEMETRY */}
      <div className="telemetry" style={{ border: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}` }}>
        <div className="hud-label">TELEMETRY</div>
        {[
          { key: 'alt',  label: 'ALT',  val: telemetry.alt.toFixed(0),  unit: 'km'   },
          { key: 'vel',  label: 'VEL',  val: telemetry.vel.toFixed(3),  unit: 'km/s' },
          { key: 'co2',  label: 'CO₂',  val: telemetry.co2.toFixed(1),  unit: 'mmHg' },
          { key: 'temp', label: 'TEMP', val: telemetry.temp.toFixed(1), unit: '°C'   },
          { key: 'batt', label: 'BATT', val: telemetry.batt.toFixed(1), unit: 'V'    },
        ].map(({ key, label, val, unit }) => (
          <div key={key} className="telem-row">
            <span className="telem-label">{label}</span>
            <span className="telem-val" style={{ color: telColor(key, parseFloat(val)) }}>
              {val} <span className="telem-unit">{unit}</span>
            </span>
          </div>
        ))}
      </div>

      {/* PHYSICS EVAL PANEL */}
      {evalResult && (
        <div className="eval-panel" style={{ borderColor: evalResult.viable ? '#4af0c0' : '#ff4400' }}
          onClick={e => e.stopPropagation()}>
          <div className="eval-header">
            <span className="eval-label">{evalResult.label || 'PHYSICS EVALUATION'}</span>
            <button className="btn-close" onClick={() => setEvalResult(null)}>✕</button>
          </div>
          <div className="eval-timeline" style={{ color: evalResult.viable ? '#4af0c0' : '#ff4400' }}>{evalResult.timeline}</div>
          <div className="eval-outcome">{evalResult.outcome}</div>
          <div className="eval-physics">{evalResult.physics_note}</div>
          {evalResult.transcript_context?.[0] && (
            <div className="eval-transcript">
              <span style={{ color: '#666' }}>ACTUAL LOG [{evalResult.transcript_context[0].met.toFixed(2)}h]: </span>
              <span style={{ color: '#aaa' }}>"{evalResult.transcript_context[0].line}"</span>
            </div>
          )}
        </div>
      )}

      {/* DECISION OVERLAY */}
      {pendingDecision && (
        <div className="decision-overlay" onClick={e => e.stopPropagation()}>
          <div className="decision-box" style={{ borderColor: isAlert ? '#ff4400' : '#ff8800' }}>
            <div className="decision-icon">⚠</div>
            <div className="decision-q">{pendingDecision.question}</div>
            <div className="decision-opts">
              {pendingDecision.options.map(opt => (
                <button key={opt} className="decision-btn"
                  style={{ borderColor: opt.includes('DECLARE') ? '#ff4400' : '#4af' }}
                  onClick={() => handleDecision(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHAT PANEL */}
      {selectedChar && (
        <div className="chat-panel"
          style={{
            border: `1px solid ${talkingChar === selectedChar.name ? '#ffff00' : (selectedChar.color || '#4af')}`,
            boxShadow: talkingChar === selectedChar.name ? '0 0 16px rgba(255,255,0,0.15)' : 'none',
          }}
          onTouchStart={onChatTouchStart}
          onTouchEnd={onChatTouchEnd}
          onClick={e => e.stopPropagation()}
        >
          <div className="chat-header">
            <div>
              <div className="chat-char-name-row">
                <span style={{ color: selectedChar.color || '#4af' }} className="chat-char-name">{selectedChar.name}</span>
                {talkingChar === selectedChar.name && <span className="speaking-badge">◉ SPEAKING</span>}
              </div>
              <div className="chat-char-title">{selectedChar.title}</div>
            </div>
            <div className="chat-header-btns">
              {talkingChar && <button className="btn-stop" onClick={stopAudio}>⏹</button>}
              <button className="btn-close" onClick={() => { stopAudio(); setSelectedChar(null) }}>✕</button>
            </div>
          </div>

          <div className="chat-bio">{selectedChar.bio}</div>

          <div className="chat-history">
            {history.length === 0 && <div className="chat-empty">— walk up to talk —</div>}
            {history.map((h, i) => (
              <div key={i} className={`chat-bubble-wrap ${h.role}`}>
                {h.time !== undefined && <div className="msg-time">{formatMissionTime(h.time)}</div>}
                <div className={`chat-bubble ${h.role}`} style={{
                  background: h.role === 'user' ? '#0f2a4a' : '#0a1a0a',
                  border: `1px solid ${h.role === 'user' ? '#1a4a8a' : '#1a3a1a'}`,
                  color: h.role === 'user' ? '#7af' : '#9f9',
                }}>{h.content}</div>
              </div>
            ))}
            {loading && <div className="chat-loading">{selectedChar.name} is transmitting...</div>}
            <div ref={chatEndRef} />
          </div>

          {history.length <= 1 && (
            <div className="quick-prompts">
              <div className="quick-label">QUICK COMMS</div>
              {(QUICK_PROMPTS[selectedChar.name] || []).map(q => (
                <button key={q} className="quick-btn" onClick={() => sendMessage(q)}>» {q}</button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              onFocus={() => { chatInputFocused.current = true }}
              onBlur={() => { chatInputFocused.current = false }}
              placeholder={transcribing ? 'Transcribing...' : recording ? 'Recording...' : 'Respond...'}
              style={{ border: `1px solid ${recording ? '#ff4400' : (selectedChar.color || '#1a3a6a')}` }}
            />
            <button className="btn-mic"
              onPointerDown={e => { e.preventDefault(); e.stopPropagation(); startRecording() }}
              onPointerUp={e => { e.preventDefault(); stopRecording() }}
              onPointerLeave={stopRecording}
              disabled={transcribing || loading}
              style={{
                background: recording ? '#3a0000' : transcribing ? '#111' : '#0a1a0a',
                color: recording ? '#ff4400' : transcribing ? '#333' : '#6a6',
                border: `1px solid ${recording ? '#ff4400' : '#1a4a1a'}`,
                animation: recording ? 'pulse 1s infinite' : 'none',
                fontSize: 12, minWidth: 40,
              }}>{micStatus}</button>
            <button id="send-btn" className="btn-send" onClick={() => sendMessage()} disabled={loading}
              style={{ background: loading ? '#111' : '#0f3460', color: loading ? '#333' : '#fff' }}>▶</button>
          </div>
        </div>
      )}

      {/* D-PAD */}
      {introPhase === 'done' && (
        <div className="dpad" onClick={e => e.stopPropagation()}>
          <button className="dpad-btn dpad-up"
            onPointerDown={e => { e.preventDefault(); startDpad([0,-1]) }}
            onPointerUp={stopDpad} onPointerLeave={stopDpad}>▲</button>
          <button className="dpad-btn dpad-left"
            onPointerDown={e => { e.preventDefault(); startDpad([-1,0]) }}
            onPointerUp={stopDpad} onPointerLeave={stopDpad}>◀</button>
          <button className="dpad-btn dpad-center" />
          <button className="dpad-btn dpad-right"
            onPointerDown={e => { e.preventDefault(); startDpad([1,0]) }}
            onPointerUp={stopDpad} onPointerLeave={stopDpad}>▶</button>
          <button className="dpad-btn dpad-down"
            onPointerDown={e => { e.preventDefault(); startDpad([0,1]) }}
            onPointerUp={stopDpad} onPointerLeave={stopDpad}>▼</button>
        </div>
      )}

      {!selectedChar && introPhase === 'done' && (
        <div className="bottom-hint">WASD · D-PAD TO MOVE · DRAG TO LOOK AROUND</div>
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .app-root { position: fixed; inset: 0; overflow: hidden; font-family: monospace; }

        .intro-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:100;cursor:pointer; }
        .intro-text { color:#4af0c0;font-family:monospace;font-size:clamp(11px,2vw,16px);line-height:1.9;white-space:pre;text-shadow:0 0 12px rgba(74,240,192,0.5);text-align:left;max-width:90vw; }
        .intro-cursor { animation:blink 0.7s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .topbar { position:absolute;top:0;left:0;right:0;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(0,0,0,0.8);z-index:30; }
        .topbar-title { font-size:clamp(9px,1.8vw,13px);letter-spacing:clamp(1px,0.3vw,2px);white-space:nowrap;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis; }
        .topbar-clock { color:#4af;font-size:clamp(9px,1.6vw,12px);letter-spacing:1px;white-space:nowrap;flex-shrink:0; }
        .topbar-actions { display:flex;gap:6px;align-items:center;flex-shrink:0; }
        .speed-controls { display:flex;gap:3px; }
        .speed-btn { background:transparent;border:1px solid #222;border-radius:3px;padding:3px 6px;font-family:monospace;font-size:clamp(9px,1.4vw,11px);cursor:pointer;transition:all 0.15s; }
        .timeline-badge { font-size:clamp(8px,1.3vw,10px);letter-spacing:1px;white-space:nowrap; }
        .export-btn { color:#4af;background:transparent;border:1px solid #1a3a6a;border-radius:4px;padding:4px clamp(6px,1vw,10px);font-family:monospace;font-size:clamp(9px,1.4vw,11px);cursor:pointer;white-space:nowrap; }
        .crisis-btn { color:#fff;border:none;border-radius:4px;padding:5px clamp(8px,1.5vw,14px);font-family:monospace;font-size:clamp(9px,1.5vw,11px);letter-spacing:1px;cursor:pointer;white-space:nowrap; }

        .broadcast { position:absolute;top:48px;left:50%;transform:translateX(-50%);width:clamp(280px,70vw,560px);background:rgba(5,5,20,0.95);border-radius:6px;padding:10px 14px;display:flex;gap:10px;align-items:flex-start;z-index:25;animation:slideDown 0.3s ease; }
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .broadcast-who { font-size:11px;font-weight:bold;white-space:nowrap;flex-shrink:0;letter-spacing:1px; }
        .broadcast-text { color:#ccc;font-size:clamp(10px,1.6vw,12px);line-height:1.5; }

        .hud { position:absolute;top:calc(44px + 8px);right:12px;font-size:clamp(9px,1.5vw,11px);display:flex;flex-direction:column;gap:6px;background:rgba(0,0,0,0.7);border-radius:6px;padding:8px 10px;width:clamp(130px,20vw,160px);z-index:10; }
        .hud-label { color:#444;letter-spacing:1px;font-size:10px; }
        .hud-row { display:flex;flex-direction:column;gap:3px; }
        .hud-row-header { display:flex;justify-content:space-between; }
        .hud-bar-bg { background:#111;border-radius:2px;height:4px;overflow:hidden; }
        .hud-bar-fill { height:100%;transition:width 0.5s,background 0.5s; }
        .hud-crew { color:#333;font-size:10px;margin-top:2px; }

        .telemetry { position:absolute;bottom:140px;right:12px;font-size:clamp(9px,1.4vw,11px);display:flex;flex-direction:column;gap:5px;background:rgba(0,0,0,0.7);border-radius:6px;padding:8px 10px;width:clamp(130px,20vw,160px);z-index:10; }
        .telem-row { display:flex;justify-content:space-between;align-items:center; }
        .telem-label { color:#444;letter-spacing:1px; }
        .telem-val { color:#4af0c0;text-align:right; }
        .telem-unit { color:#333;font-size:9px; }

        .eval-panel { position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:clamp(280px,60vw,500px);background:rgba(4,8,18,0.98);border:1px solid #4af0c0;border-radius:8px;padding:12px 14px;z-index:25;display:flex;flex-direction:column;gap:6px;animation:slideDown 0.3s ease; }
        .eval-header { display:flex;justify-content:space-between;align-items:center; }
        .eval-label { color:#666;font-size:10px;letter-spacing:1px; }
        .eval-timeline { font-size:clamp(10px,1.8vw,13px);font-weight:bold;letter-spacing:1px; }
        .eval-outcome { color:#ccc;font-size:clamp(10px,1.6vw,12px);line-height:1.5; }
        .eval-physics { color:#446;font-size:10px;line-height:1.4;border-top:1px solid #111;padding-top:6px; }
        .eval-transcript { color:#555;font-size:10px;line-height:1.4;border-top:1px solid #111;padding-top:4px;font-style:italic; }

        .decision-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:60; }
        .decision-box { background:rgba(8,4,16,0.99);border:1px solid #ff8800;border-radius:10px;padding:28px 24px;max-width:clamp(280px,88vw,420px);width:100%;display:flex;flex-direction:column;gap:16px;align-items:center;animation:popIn 0.25s ease; }
        @keyframes popIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .decision-icon { font-size:28px; }
        .decision-q { color:#ccc;font-family:monospace;font-size:clamp(11px,2vw,14px);text-align:center;line-height:1.6; }
        .decision-opts { display:flex;flex-direction:column;gap:10px;width:100%; }
        .decision-btn { background:rgba(10,10,30,0.9);color:#fff;border:1px solid #ff8800;border-radius:6px;padding:10px 16px;font-family:monospace;font-size:clamp(11px,1.8vw,13px);cursor:pointer;letter-spacing:1px;transition:background 0.2s; }

        .chat-panel { position:absolute;bottom:12px;left:12px;width:clamp(260px,42vw,340px);max-height:calc(100vh - 68px);background:rgba(5,5,20,0.97);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;transition:border-color 0.3s,box-shadow 0.3s;z-index:20;touch-action:pan-y; }
        .chat-header { display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0; }
        .chat-char-name-row { display:flex;align-items:center;gap:8px; }
        .chat-char-name { font-size:clamp(12px,2vw,15px);font-weight:bold; }
        .speaking-badge { color:#ffff00;font-size:10px;animation:pulse 0.6s infinite; }
        .chat-char-title { color:#666;font-size:clamp(9px,1.5vw,11px);margin-top:2px; }
        .chat-header-btns { display:flex;gap:5px;flex-shrink:0; }
        .btn-stop { background:#1a0a00;color:#ff8800;border:1px solid #ff8800;border-radius:4px;padding:2px 7px;font-family:monospace;font-size:10px;cursor:pointer; }
        .btn-close { background:transparent;color:#444;border:1px solid #222;border-radius:4px;padding:2px 7px;font-family:monospace;font-size:11px;cursor:pointer; }
        .chat-bio { color:#555;font-size:clamp(10px,1.5vw,11px);line-height:1.5;border-bottom:1px solid #111;padding-bottom:8px;flex-shrink:0; }
        .chat-history { flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;min-height:48px;max-height:28vh; }
        .chat-empty { color:#333;font-size:11px;text-align:center;margin-top:8px; }
        .chat-bubble-wrap { display:flex;flex-direction:column;gap:2px; }
        .chat-bubble-wrap.user { align-items:flex-end; }
        .chat-bubble-wrap.assistant { align-items:flex-start; }
        .msg-time { color:#333;font-size:9px;letter-spacing:0.5px; }
        .chat-bubble { border-radius:6px;padding:6px 9px;font-size:clamp(11px,1.8vw,12px);line-height:1.5;max-width:85%;word-break:break-word; }
        .chat-loading { color:#444;font-size:11px;align-self:flex-start;animation:pulse 1s infinite; }
        .quick-prompts { display:flex;flex-direction:column;gap:4px;border-top:1px solid #111;padding-top:6px;flex-shrink:0; }
        .quick-label { color:#333;font-size:10px;margin-bottom:2px; }
        .quick-btn { background:#0a0f1a;color:#4a8aaa;border:1px solid #1a2a3a;border-radius:4px;padding:5px 8px;font-family:monospace;font-size:clamp(10px,1.6vw,11px);cursor:pointer;text-align:left; }
        .chat-input-row { display:flex;gap:5px;flex-shrink:0; }
        .chat-input { flex:1;background:#0a0a1a;border-radius:4px;padding:7px 9px;color:#ddd;font-family:monospace;font-size:clamp(11px,1.8vw,12px);outline:none;transition:border-color 0.2s;min-width:0; }
        .btn-mic { border-radius:4px;padding:7px 6px;font-family:monospace;cursor:pointer;flex-shrink:0;user-select:none;transition:all 0.1s; }
        .btn-send { border:none;border-radius:4px;padding:7px 11px;font-family:monospace;font-size:12px;cursor:pointer;flex-shrink:0; }
        .btn-send:disabled { cursor:default; }

        .dpad {
          position: absolute;
          bottom: 24px;
          right: 24px;
          display: grid;
          grid-template-areas: ". up ." "left center right" ". down .";
          grid-template-columns: 48px 48px 48px;
          grid-template-rows: 48px 48px 48px;
          gap: 4px;
          z-index: 15;
        }
        .dpad-btn {
          background: rgba(0,0,10,0.75);
          border: 1px solid #1a3a6a;
          border-radius: 8px;
          color: #4af;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          touch-action: none;
          transition: background 0.1s, border-color 0.1s;
        }
        .dpad-btn:active { background: rgba(26,58,106,0.85); border-color: #4af; }
        .dpad-up     { grid-area: up; }
        .dpad-left   { grid-area: left; }
        .dpad-center { grid-area: center; background: transparent; border-color: transparent; pointer-events: none; }
        .dpad-right  { grid-area: right; }
        .dpad-down   { grid-area: down; }

        .bottom-hint { position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#1e1e2e;font-family:monospace;font-size:clamp(8px,1.4vw,10px);letter-spacing:1px;pointer-events:none;white-space:nowrap;z-index:5; }

        @media (max-width: 480px) {
          .chat-panel { left:8px;right:8px;width:auto;bottom:8px;max-height:50vh; }
          .hud { display:none; }
          .telemetry { display:none; }
          .topbar-title { display:none; }
          .bottom-hint { display:none; }
          .broadcast { width:96vw; }
          .eval-panel { width:96vw;left:2vw;transform:none; }
          .timeline-badge { display:none; }
          .dpad { bottom:16px;right:16px; }
          .dpad-btn { width:44px;height:44px;font-size:16px; }
        }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
