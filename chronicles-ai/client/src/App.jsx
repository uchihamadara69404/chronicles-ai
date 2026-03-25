import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import World from './world/World'

const API = '/api'

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
  { id: 'e1', at: 8,   charKey: 'KRANZ',  text: "All stations — verify your systems. Stay sharp tonight." },
  { id: 'e2', at: 30,  charKey: 'ENG-3',  text: "Flight, showing anomalous O2 tank 2 heater cycling. Watching it." },
  { id: 'e3', at: 75,  charKey: 'ENG-1',  text: "Trajectory nominal. Vehicle is right on the money at 199,340 klicks." },
  { id: 'e4', at: 140, charKey: 'KRANZ',  text: "Odyssey, Houston — requesting cryo stir on all tanks. Acknowledge." },
  {
    id: 'e5', at: 200, charKey: 'ENG-3',
    text: "FLIGHT — MASTER ALARM. Tank 2 pressure spike then dropout. I've lost SM O2 tank 2 telemetry.",
    decision: {
      question: "FLIGHT DIRECTOR: Major anomaly confirmed. Your call —",
      options: ["DECLARE EMERGENCY", "HOLD AND MONITOR"],
    },
  },
  { id: 'e6', at: 240, charKey: 'ENG-1',  text: "Flight, I'm showing attitude disturbance. Something vented from the SM." },
]

const CRISIS_EVENTS = [
  { id: 'c1', at: 10,  charKey: 'ENG-3',  text: "Power is at 27 amps and dropping fast. We need to start shedding load NOW." },
  { id: 'c2', at: 40,  charKey: 'ENG-4',  text: "PC+2 burn window opens at 79:30 MET. That's our best shot at Pacific splashdown." },
  { id: 'c3', at: 85,  charKey: 'ENG-5',  text: "Cabin temp is dropping. At this rate — 38 degrees Fahrenheit in six hours. Hypothermia is a real risk." },
  { id: 'c4', at: 135, charKey: 'KRANZ',  text: "People — I want solutions, not problems. What do we HAVE to work with? Work the problem." },
  { id: 'c5', at: 200, charKey: 'ENG-2',  text: "Flight, CO2 scrubbers in the LEM saturate in roughly 87 hours. Square canisters from Odyssey won't fit Aquarius's round holes." },
  { id: 'c6', at: 280, charKey: 'ENG-5',  text: "Lovell's reporting 3.5 rem radiation exposure. Nothing critical yet, but I'm watching the number." },
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
]
const INTRO_FULL = INTRO_LINES.join('\n')

export default function App() {
  const [selectedChar, setSelectedChar] = useState(null)
  const [isAlert, setIsAlert] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [talkingChar, setTalkingChar] = useState(null)
  const [o2, setO2] = useState(100)
  const [power, setPower] = useState(100)
  const [missionTime, setMissionTime] = useState(0)

  // New state
  const [introPhase, setIntroPhase] = useState('typing')
  const [introText, setIntroText] = useState('')
  const [broadcast, setBroadcast] = useState(null)
  const [sharedLog, setSharedLog] = useState([])
  const [telemetry, setTelemetry] = useState({ alt: 199340, vel: 1.53, co2: 2.5, temp: 21.0, batt: 29.5 })
  const [pendingDecision, setPendingDecision] = useState(null)
  const [audioReady, setAudioReady] = useState(false)

  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const alertRef = useRef(isAlert)
  alertRef.current = isAlert
  const audioCtxRef = useRef(null)
  const firedEventsRef = useRef(new Set())
  const crisisEventsRef = useRef(new Set())
  const alertStartTimeRef = useRef(null)
  const touchStartXRef = useRef(null)
  const broadcastTimerRef = useRef(null)
  const missionTimeRef = useRef(0)
  missionTimeRef.current = missionTime

  const voiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Intro typewriter
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

  // Main timer
  useEffect(() => {
    const timer = setInterval(() => {
      setMissionTime(t => t + 1)
      if (alertRef.current) {
        setO2(v => Math.max(0, v - 0.08))
        setPower(v => Math.max(0, v - 0.12))
      }
      setTelemetry(t => ({
        alt:  Math.max(0, t.alt - (Math.random() * 0.8 + 0.2)),
        vel:  alertRef.current ? Math.min(t.vel + Math.random() * 0.002, 2.1) : t.vel + (Math.random() - 0.6) * 0.001,
        co2:  alertRef.current ? Math.min(t.co2 + 0.018, 15.0) : Math.max(t.co2 - 0.001, 2.4),
        temp: alertRef.current ? Math.max(t.temp - 0.04, 4.0) : Math.min(t.temp + 0.01, 21.5),
        batt: alertRef.current ? Math.max(t.batt - 0.025, 0) : Math.min(t.batt + 0.001, 29.5),
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Scripted mission events
  useEffect(() => {
    if (introPhase !== 'done') return
    MISSION_EVENTS.forEach(ev => {
      if (!firedEventsRef.current.has(ev.id) && missionTime >= ev.at) {
        firedEventsRef.current.add(ev.id)
        showBroadcast(ev.charKey, ev.text)
        if (ev.decision) {
          setTimeout(() => setPendingDecision(ev.decision), 6000)
        }
      }
    })
  }, [missionTime, introPhase])

  // Crisis scripted events
  useEffect(() => {
    if (!isAlert) return
    if (alertStartTimeRef.current === null) {
      alertStartTimeRef.current = missionTimeRef.current
    }
    const elapsed = missionTime - alertStartTimeRef.current
    CRISIS_EVENTS.forEach(ev => {
      if (!crisisEventsRef.current.has(ev.id) && elapsed >= ev.at) {
        crisisEventsRef.current.add(ev.id)
        showBroadcast(ev.charKey, ev.text)
      }
    })
  }, [missionTime, isAlert])

  const showBroadcast = useCallback((charKey, text) => {
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
    setBroadcast({ charKey, text, color: CHAR_COLORS[charKey] || '#4af' })
    setSharedLog(prev => [...prev.slice(-11), { char: charKey, text, time: missionTimeRef.current }])
    broadcastTimerRef.current = setTimeout(() => setBroadcast(null), 7000)
  }, [])

  // Ambient audio init — triggered on first interaction
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      // HVAC white noise
      const bufSize = ctx.sampleRate * 3
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      noise.loop = true
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 350
      noiseFilter.Q.value = 0.4
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.035
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noise.start()

      // 60Hz electrical hum
      const hum = ctx.createOscillator()
      hum.type = 'sawtooth'
      hum.frequency.value = 60
      const humGain = ctx.createGain()
      humGain.gain.value = 0.005
      hum.connect(humGain)
      humGain.connect(ctx.destination)
      hum.start()

      setAudioReady(true)
    } catch {}
  }, [])

  const playAlarm = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0
      osc.start()
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

  const speak = (text, charName) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setTalkingChar(charName)
    const doSpeak = () => {
      const utt = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const enVoice = voices.find(v => v.lang.startsWith('en'))
      if (enVoice) utt.voice = enVoice
      utt.rate = 0.95
      utt.pitch = 1.0
      utt.volume = 1
      utt.onend = () => setTalkingChar(null)
      utt.onerror = () => setTalkingChar(null)
      window.speechSynthesis.speak(utt)
    }
    setTimeout(() => {
      if (window.speechSynthesis.getVoices().length > 0) doSpeak()
      else window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
    }, 150)
  }

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel()
    setTalkingChar(null)
  }

  const startListening = () => {
    if (!voiceSupported || listening) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec
    rec.onstart = () => setListening(true)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setMessage(transcript)
      rec._hasResult = true
    }
    rec.onend = () => {
      setListening(false)
      if (rec._hasResult) setTimeout(() => document.getElementById('send-btn')?.click(), 300)
    }
    rec.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const handleSelect = (char) => {
    stopSpeaking()
    setSelectedChar(char)
    setHistory([])
    setMessage('')
  }

  const handleCrisisToggle = () => {
    const next = !isAlert
    setIsAlert(next)
    setSelectedChar(null)
    if (next) {
      setO2(82)
      setPower(74)
      alertStartTimeRef.current = missionTimeRef.current
      playAlarm()
    } else {
      setO2(100)
      setPower(100)
      alertStartTimeRef.current = null
      crisisEventsRef.current = new Set()
    }
  }

  const handleDecision = (option) => {
    setPendingDecision(null)
    setSharedLog(prev => [...prev.slice(-11), { char: 'FLIGHT', text: `DECISION: ${option}`, time: missionTimeRef.current }])
    if (option === 'DECLARE EMERGENCY') {
      setIsAlert(true)
      setO2(82)
      setPower(74)
      alertStartTimeRef.current = missionTimeRef.current
      playAlarm()
      showBroadcast('KRANZ', "This is now a contingency. All stations — we are declaring an emergency. Failure is not an option.")
    } else {
      showBroadcast('KRANZ', "Copy. All stations, stand by. Continue monitoring. I want answers in five minutes.")
      setTimeout(() => {
        showBroadcast('ENG-3', "Flight — we can't hold anymore. Complete loss of SM O2 tank 2. This is not recoverable.")
        setTimeout(() => setPendingDecision({
          question: "Tank 2 is confirmed gone. Crew safety at risk. Your call —",
          options: ["DECLARE EMERGENCY", "CONTINUE ASSESSMENT"],
        }), 6000)
      }, 30000)
    }
  }

  const sendMessage = async (overrideMsg) => {
    const msg = overrideMsg || message
    if (!msg.trim() || loading) return
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
          character: selectedChar.name,
          message: msg,
          history: history.slice(-8).map(h => ({ role: h.role, content: h.content })),
          shared_context: sharedLog.slice(-4).map(e => ({ char: e.char, text: e.text })),
        }),
      })
      const data = await res.json()
      const reply = data.response
      const replyTime = missionTimeRef.current
      setHistory([...newHistory, { role: 'assistant', content: reply, time: replyTime }])
      setSharedLog(prev => [...prev.slice(-11), { char: selectedChar.name, text: reply, time: replyTime }])
      speak(reply, selectedChar.name)
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: '[COMMS FAILURE]', time: msgTime }])
    }
    setLoading(false)
  }

  const exportTranscript = () => {
    if (sharedLog.length === 0) return
    const lines = [`APOLLO 13 MISSION TRANSCRIPT`, `Generated: ${formatMissionTime(missionTimeRef.current)}`, `${'═'.repeat(42)}`, '']
    sharedLog.forEach(e => {
      lines.push(`[${formatMissionTime(e.time)}] ${CHAR_LABELS[e.char] || e.char}`)
      lines.push(e.text)
      lines.push('')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'apollo13-transcript.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const gaugeColor = (val) => {
    if (val > 60) return '#4af0c0'
    if (val > 30) return '#ffaa00'
    return '#ff4400'
  }

  const telColor = (key, val) => {
    if (key === 'co2' && val > 7) return '#ff4400'
    if (key === 'co2' && val > 4) return '#ffaa00'
    if (key === 'temp' && val < 10) return '#4af'
    if (key === 'temp' && val < 15) return '#ffaa00'
    if (key === 'batt' && val < 20) return '#ff4400'
    if (key === 'batt' && val < 25) return '#ffaa00'
    return '#4af0c0'
  }

  const handleGlobalClick = () => {
    if (introPhase !== 'done') {
      setIntroPhase('done')
      initAudio()
    }
  }

  // Swipe-to-close chat panel
  const onChatTouchStart = (e) => { touchStartXRef.current = e.touches[0].clientX }
  const onChatTouchEnd = (e) => {
    if (touchStartXRef.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartXRef.current
    if (dx < -60) { stopSpeaking(); setSelectedChar(null) }
    touchStartXRef.current = null
  }

  return (
    <div className="app-root" style={{ background: isAlert ? '#0d0000' : '#0a0a1a' }} onClick={handleGlobalClick}>
      <Canvas camera={{ position: [0, 14, 10], fov: 50 }} shadows>
        <ambientLight intensity={isAlert ? 0.2 : 0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <pointLight position={[0, 5, 0]} color={isAlert ? '#ff0000' : '#4466ff'} intensity={isAlert ? 1.5 : 0.3} />
        <World isAlert={isAlert} onCharacterSelect={handleSelect} selectedChar={selectedChar} talkingChar={talkingChar} />
        <OrbitControls maxPolarAngle={Math.PI / 2.8} minDistance={8} maxDistance={25} />
      </Canvas>

      {/* INTRO OVERLAY */}
      {introPhase !== 'done' && (
        <div className="intro-overlay" onClick={handleGlobalClick}>
          <pre className="intro-text">{introText}<span className="intro-cursor">█</span></pre>
        </div>
      )}

      {/* TOP BAR */}
      <div className="topbar" style={{ borderBottom: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}` }}>
        <span className="topbar-title" style={{ color: isAlert ? '#ff4400' : '#4af' }}>
          CHRONICLES AI · APOLLO 13
        </span>
        <span className="topbar-clock">{formatMissionTime(missionTime)}</span>
        <div className="topbar-actions">
          {sharedLog.length > 0 && (
            <button className="export-btn" onClick={e => { e.stopPropagation(); exportTranscript() }} title="Export mission log">
              ⬇ LOG
            </button>
          )}
          <button className="crisis-btn" onClick={e => { e.stopPropagation(); handleCrisisToggle() }}
            style={{ background: isAlert ? '#ff4400' : '#1a3a6a' }}>
            {isAlert ? '⚠ CRISIS' : 'TRIGGER CRISIS'}
          </button>
        </div>
      </div>

      {/* BROADCAST BAR */}
      {broadcast && (
        <div className="broadcast" style={{ borderLeft: `3px solid ${broadcast.color}` }}>
          <span className="broadcast-who" style={{ color: broadcast.color }}>
            {CHAR_LABELS[broadcast.charKey] || broadcast.charKey}
          </span>
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
          CREW: {isAlert
            ? <span style={{ color: '#ff8800' }}>⚠ AT RISK</span>
            : <span style={{ color: '#4af0c0' }}>NOMINAL</span>}
        </div>
      </div>

      {/* TELEMETRY PANEL */}
      <div className="telemetry" style={{ border: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}` }}>
        <div className="hud-label">TELEMETRY</div>
        {[
          { key: 'alt',  label: 'ALT',  val: telemetry.alt.toFixed(0),    unit: 'km' },
          { key: 'vel',  label: 'VEL',  val: telemetry.vel.toFixed(3),    unit: 'km/s' },
          { key: 'co2',  label: 'CO₂',  val: telemetry.co2.toFixed(1),    unit: 'mmHg' },
          { key: 'temp', label: 'TEMP', val: telemetry.temp.toFixed(1),   unit: '°C' },
          { key: 'batt', label: 'BATT', val: telemetry.batt.toFixed(1),   unit: 'V' },
        ].map(({ key, label, val, unit }) => (
          <div key={key} className="telem-row">
            <span className="telem-label">{label}</span>
            <span className="telem-val" style={{ color: telColor(key, parseFloat(val)) }}>
              {val} <span className="telem-unit">{unit}</span>
            </span>
          </div>
        ))}
      </div>

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
        <div
          className="chat-panel"
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
                <span style={{ color: selectedChar.color || '#4af' }} className="chat-char-name">
                  {selectedChar.name}
                </span>
                {talkingChar === selectedChar.name && (
                  <span className="speaking-badge">◉ SPEAKING</span>
                )}
              </div>
              <div className="chat-char-title">{selectedChar.title}</div>
            </div>
            <div className="chat-header-btns">
              {talkingChar && (
                <button className="btn-stop" onClick={stopSpeaking} title="Stop speaking">⏹</button>
              )}
              <button className="btn-close" onClick={() => { stopSpeaking(); setSelectedChar(null) }}>✕</button>
            </div>
          </div>

          <div className="chat-bio">{selectedChar.bio}</div>

          <div className="chat-history">
            {history.length === 0 && (
              <div className="chat-empty">— open comms —</div>
            )}
            {history.map((h, i) => (
              <div key={i} className={`chat-bubble-wrap ${h.role}`}>
                {h.time !== undefined && (
                  <div className="msg-time">{formatMissionTime(h.time)}</div>
                )}
                <div className={`chat-bubble ${h.role}`} style={{
                  background: h.role === 'user' ? '#0f2a4a' : '#0a1a0a',
                  border: `1px solid ${h.role === 'user' ? '#1a4a8a' : '#1a3a1a'}`,
                  color: h.role === 'user' ? '#7af' : '#9f9',
                }}>
                  {h.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-loading">{selectedChar.name} is transmitting...</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {history.length === 0 && (
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
              placeholder={listening ? 'Listening...' : 'Speak to mission control...'}
              style={{ border: `1px solid ${listening ? '#ff4400' : (selectedChar.color || '#1a3a6a')}` }}
            />
            {voiceSupported && (
              <button
                className="btn-mic"
                onPointerDown={e => { e.stopPropagation(); startListening() }}
                onPointerUp={stopListening}
                onPointerLeave={stopListening}
                style={{
                  background: listening ? '#3a0000' : '#0a1a0a',
                  color: listening ? '#ff4400' : '#6a6',
                  border: `1px solid ${listening ? '#ff4400' : '#1a4a1a'}`,
                  animation: listening ? 'pulse 1s infinite' : 'none',
                }}
              >🎙</button>
            )}
            <button
              id="send-btn"
              className="btn-send"
              onClick={() => sendMessage()}
              disabled={loading}
              style={{ background: loading ? '#111' : '#0f3460', color: loading ? '#333' : '#fff' }}
            >▶</button>
          </div>
        </div>
      )}

      {!selectedChar && introPhase === 'done' && (
        <div className="bottom-hint">
          CLICK A CHARACTER · DRAG TO ROTATE · SCROLL TO ZOOM
        </div>
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .app-root {
          position: fixed;
          inset: 0;
          overflow: hidden;
          font-family: monospace;
        }

        /* ── INTRO ── */
        .intro-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          cursor: pointer;
        }
        .intro-text {
          color: #4af0c0;
          font-family: monospace;
          font-size: clamp(12px, 2.2vw, 18px);
          line-height: 1.8;
          white-space: pre;
          text-shadow: 0 0 12px rgba(74,240,192,0.5);
          text-align: left;
          max-width: 90vw;
        }
        .intro-cursor {
          animation: blink 0.7s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* ── TOP BAR ── */
        .topbar {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: rgba(0,0,0,0.8);
          z-index: 30;
        }
        .topbar-title {
          font-size: clamp(9px, 1.8vw, 13px);
          letter-spacing: clamp(1px, 0.3vw, 2px);
          white-space: nowrap;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .topbar-clock {
          color: #4af;
          font-size: clamp(9px, 1.6vw, 12px);
          letter-spacing: 1px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .topbar-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .export-btn {
          color: #4af;
          background: transparent;
          border: 1px solid #1a3a6a;
          border-radius: 4px;
          padding: 4px clamp(6px, 1vw, 10px);
          font-family: monospace;
          font-size: clamp(9px, 1.4vw, 11px);
          cursor: pointer;
          white-space: nowrap;
        }
        .crisis-btn {
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 5px clamp(8px, 1.5vw, 14px);
          font-family: monospace;
          font-size: clamp(9px, 1.5vw, 11px);
          letter-spacing: 1px;
          cursor: pointer;
          white-space: nowrap;
        }

        /* ── BROADCAST ── */
        .broadcast {
          position: absolute;
          top: 48px;
          left: 50%;
          transform: translateX(-50%);
          width: clamp(280px, 70vw, 560px);
          background: rgba(5,5,20,0.95);
          border-radius: 6px;
          padding: 10px 14px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          z-index: 25;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .broadcast-who {
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          flex-shrink: 0;
          letter-spacing: 1px;
        }
        .broadcast-text {
          color: #ccc;
          font-size: clamp(10px, 1.6vw, 12px);
          line-height: 1.5;
        }

        /* ── SYSTEMS HUD ── */
        .hud {
          position: absolute;
          top: calc(44px + 8px);
          right: 12px;
          font-size: clamp(9px, 1.5vw, 11px);
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0,0,0,0.7);
          border-radius: 6px;
          padding: 8px 10px;
          width: clamp(130px, 20vw, 160px);
          z-index: 10;
        }
        .hud-label { color: #444; letter-spacing: 1px; font-size: 10px; }
        .hud-row { display: flex; flex-direction: column; gap: 3px; }
        .hud-row-header { display: flex; justify-content: space-between; }
        .hud-bar-bg { background: #111; border-radius: 2px; height: 4px; overflow: hidden; }
        .hud-bar-fill { height: 100%; transition: width 0.5s, background 0.5s; }
        .hud-crew { color: #333; font-size: 10px; margin-top: 2px; }

        /* ── TELEMETRY ── */
        .telemetry {
          position: absolute;
          bottom: 12px;
          right: 12px;
          font-size: clamp(9px, 1.4vw, 11px);
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: rgba(0,0,0,0.7);
          border-radius: 6px;
          padding: 8px 10px;
          width: clamp(130px, 20vw, 160px);
          z-index: 10;
        }
        .telem-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .telem-label { color: #444; letter-spacing: 1px; }
        .telem-val { color: #4af0c0; text-align: right; }
        .telem-unit { color: #333; font-size: 9px; }

        /* ── DECISION OVERLAY ── */
        .decision-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
        }
        .decision-box {
          background: rgba(8,4,16,0.99);
          border: 1px solid #ff8800;
          border-radius: 10px;
          padding: 28px 24px;
          max-width: clamp(280px, 88vw, 420px);
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
          animation: popIn 0.25s ease;
        }
        @keyframes popIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .decision-icon { font-size: 28px; }
        .decision-q {
          color: #ccc;
          font-family: monospace;
          font-size: clamp(11px, 2vw, 14px);
          text-align: center;
          line-height: 1.6;
        }
        .decision-opts { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .decision-btn {
          background: rgba(10,10,30,0.9);
          color: #fff;
          border: 1px solid #ff8800;
          border-radius: 6px;
          padding: 10px 16px;
          font-family: monospace;
          font-size: clamp(11px, 1.8vw, 13px);
          cursor: pointer;
          letter-spacing: 1px;
          transition: background 0.2s;
        }
        .decision-btn:hover { background: rgba(40,20,5,0.9); }

        /* ── CHAT PANEL ── */
        .chat-panel {
          position: absolute;
          bottom: 12px;
          left: 12px;
          width: clamp(260px, 88vw, 340px);
          max-height: calc(100vh - 68px);
          background: rgba(5,5,20,0.97);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.3s, box-shadow 0.3s;
          z-index: 20;
          touch-action: pan-y;
        }
        .chat-header { display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; }
        .chat-char-name-row { display: flex; align-items: center; gap: 8px; }
        .chat-char-name { font-size: clamp(12px, 2vw, 15px); font-weight: bold; }
        .speaking-badge { color: #ffff00; font-size: 10px; animation: pulse 0.6s infinite; }
        .chat-char-title { color: #666; font-size: clamp(9px, 1.5vw, 11px); margin-top: 2px; }
        .chat-header-btns { display: flex; gap: 5px; flex-shrink: 0; }
        .btn-stop { background:#1a0a00;color:#ff8800;border:1px solid #ff8800;border-radius:4px;padding:2px 7px;font-family:monospace;font-size:10px;cursor:pointer; }
        .btn-close { background:transparent;color:#444;border:1px solid #222;border-radius:4px;padding:2px 7px;font-family:monospace;font-size:11px;cursor:pointer; }
        .chat-bio { color:#555;font-size:clamp(10px,1.5vw,11px);line-height:1.5;border-bottom:1px solid #111;padding-bottom:8px;flex-shrink:0; }
        .chat-history { flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;min-height:48px;max-height:32vh; }
        .chat-empty { color:#333;font-size:11px;text-align:center;margin-top:8px; }
        .chat-bubble-wrap { display:flex;flex-direction:column;gap:2px; }
        .chat-bubble-wrap.user { align-items: flex-end; }
        .chat-bubble-wrap.assistant { align-items: flex-start; }
        .msg-time { color:#333;font-size:9px;letter-spacing:0.5px; }
        .chat-bubble { border-radius:6px;padding:6px 9px;font-size:clamp(11px,1.8vw,12px);line-height:1.5;max-width:85%;word-break:break-word; }
        .chat-loading { color:#444;font-size:11px;align-self:flex-start;animation:pulse 1s infinite; }
        .quick-prompts { display:flex;flex-direction:column;gap:4px;border-top:1px solid #111;padding-top:6px;flex-shrink:0; }
        .quick-label { color:#333;font-size:10px;margin-bottom:2px; }
        .quick-btn { background:#0a0f1a;color:#4a8aaa;border:1px solid #1a2a3a;border-radius:4px;padding:5px 8px;font-family:monospace;font-size:clamp(10px,1.6vw,11px);cursor:pointer;text-align:left; }
        .chat-input-row { display:flex;gap:5px;flex-shrink:0; }
        .chat-input { flex:1;background:#0a0a1a;border-radius:4px;padding:7px 9px;color:#ddd;font-family:monospace;font-size:clamp(11px,1.8vw,12px);outline:none;transition:border-color 0.2s;min-width:0; }
        .btn-mic { border-radius:4px;padding:7px 9px;font-family:monospace;font-size:14px;cursor:pointer;flex-shrink:0;user-select:none; }
        .btn-send { border:none;border-radius:4px;padding:7px 11px;font-family:monospace;font-size:12px;cursor:pointer;flex-shrink:0; }
        .btn-send:disabled { cursor:default; }

        /* ── BOTTOM HINT ── */
        .bottom-hint {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          color: #1e1e2e;
          font-family: monospace;
          font-size: clamp(8px, 1.4vw, 11px);
          letter-spacing: 1px;
          pointer-events: none;
          white-space: nowrap;
          z-index: 5;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 480px) {
          .chat-panel { left:8px;right:8px;width:auto;bottom:8px; }
          .hud { display:none; }
          .telemetry { display:none; }
          .topbar-title { display:none; }
          .bottom-hint { display:none; }
          .broadcast { width:96vw; }
        }
        @media (max-width: 768px) and (min-width: 481px) {
          .chat-panel { width:clamp(260px,50vw,340px); }
          .hud { width:clamp(120px,18vw,150px);font-size:10px; }
          .telemetry { width:clamp(120px,18vw,150px);font-size:10px; }
        }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
