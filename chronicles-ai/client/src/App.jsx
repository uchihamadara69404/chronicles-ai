import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import World from './world/World'

const API = '/api'


const QUICK_PROMPTS = {
  'KRANZ':  ["What's the situation?", "Can we save the crew?", "What are our options?"],
  'ENG-1':  ["Where is the spacecraft now?", "Can we correct the trajectory?", "How long until splashdown?"],
  'ENG-2':  ["Is the guidance computer still working?", "Can we trust the navigation?", "What does the data show?"],
  'ENG-3':  ["How much power do we have left?", "Is the oxygen holding?", "What do we shut down first?"],
  'ENG-4':  ["How do we get them home?", "When is the re-entry window?", "What burn do we need?"],
  'ENG-5':  ["How is the crew holding up?", "Are they in danger?", "What are their vitals?"],
}

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
  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const alertRef = useRef(isAlert)
  alertRef.current = isAlert

  const voiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  useEffect(() => {
    const timer = setInterval(() => {
      setMissionTime(t => t + 1)
      if (alertRef.current) {
        setO2(v => Math.max(0, v - 0.08))
        setPower(v => Math.max(0, v - 0.12))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleCrisisToggle = () => {
    const next = !isAlert
    setIsAlert(next)
    setSelectedChar(null)
    if (next) {
      setO2(82)
      setPower(74)
    } else {
      setO2(100)
      setPower(100)
    }
  }

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
      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak()
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
      }
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
      if (rec._hasResult) {
        setTimeout(() => {
          document.getElementById('send-btn')?.click()
        }, 300)
      }
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

  const sendMessage = async (overrideMsg) => {
    const msg = overrideMsg || message
    if (!msg.trim() || loading) return
    const userMsg = { role: 'user', content: msg }
    const newHistory = [...history, userMsg]
    setHistory(newHistory)
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: selectedChar.name,
          message: msg,
          history: history,
        }),
      })
      const data = await res.json()
      const reply = data.response
      setHistory([...newHistory, { role: 'assistant', content: reply }])
      speak(reply, selectedChar.name)
    } catch (e) {
      setHistory([...newHistory, { role: 'assistant', content: '[COMMS FAILURE]' }])
    }
    setLoading(false)
  }

  const gaugeColor = (val) => {
    if (val > 60) return '#4af0c0'
    if (val > 30) return '#ffaa00'
    return '#ff4400'
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: isAlert ? '#0d0000' : '#0a0a1a' }}>
      <Canvas camera={{ position: [0, 14, 10], fov: 50 }} shadows>
        <ambientLight intensity={isAlert ? 0.2 : 0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <pointLight position={[0, 5, 0]} color={isAlert ? '#ff0000' : '#4466ff'} intensity={isAlert ? 1.5 : 0.3} />
        <World
          isAlert={isAlert}
          onCharacterSelect={handleSelect}
          selectedChar={selectedChar}
          talkingChar={talkingChar}
        />
        <OrbitControls maxPolarAngle={Math.PI / 2.8} minDistance={8} maxDistance={25} />
      </Canvas>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '10px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        borderBottom: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}`,
      }}>
        <span style={{ color: isAlert ? '#ff4400' : '#4af', fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>
          CHRONICLES AI · APOLLO 13 · 1970
        </span>
        <span style={{ color: '#4af', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 }}>
          {formatMissionTime(missionTime)}
        </span>
        <button
          onClick={handleCrisisToggle}
          style={{
            background: isAlert ? '#ff4400' : '#1a3a6a',
            color: '#fff', border: 'none', borderRadius: 4,
            padding: '6px 16px', fontFamily: 'monospace',
            fontSize: 12, letterSpacing: 1, cursor: 'pointer',
          }}
        >
          {isAlert ? '⚠ CRISIS ACTIVE' : 'TRIGGER CRISIS'}
        </button>
      </div>

      {/* Mission status HUD — top right */}
      <div style={{
        position: 'absolute', top: 52, right: 20,
        fontFamily: 'monospace', fontSize: 11,
        display: 'flex', flexDirection: 'column', gap: 8,
        background: 'rgba(0,0,0,0.6)',
        border: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}`,
        borderRadius: 6, padding: '10px 14px',
        minWidth: 160,
      }}>
        <div style={{ color: '#666', letterSpacing: 1, marginBottom: 2 }}>SYSTEMS STATUS</div>

        {[
          { label: 'O₂ SUPPLY', value: o2 },
          { label: 'POWER', value: power },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#555' }}>{label}</span>
              <span style={{ color: gaugeColor(value) }}>{value.toFixed(0)}%</span>
            </div>
            <div style={{ background: '#111', borderRadius: 2, height: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${value}%`, height: '100%',
                background: gaugeColor(value),
                transition: 'width 0.5s, background 0.5s',
              }} />
            </div>
          </div>
        ))}

        <div style={{ color: '#333', marginTop: 2 }}>
          CREW STATUS: {isAlert ? <span style={{ color: '#ff8800' }}>⚠ AT RISK</span> : <span style={{ color: '#4af0c0' }}>NOMINAL</span>}
        </div>
      </div>

      {/* Chat panel */}
      {selectedChar && (
        <div style={{
          position: 'absolute', bottom: 40, left: 30,
          background: 'rgba(5,5,20,0.96)',
          border: `1px solid ${talkingChar === selectedChar.name ? '#ffff00' : (selectedChar.color || '#4af')}`,
          borderRadius: 8, padding: '16px',
          width: 330, fontFamily: 'monospace',
          display: 'flex', flexDirection: 'column', gap: 10,
          maxHeight: '65vh',
          transition: 'border-color 0.3s',
          boxShadow: talkingChar === selectedChar.name ? `0 0 16px rgba(255,255,0,0.2)` : 'none',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: selectedChar.color || '#4af', fontSize: 15, fontWeight: 'bold' }}>
                  {selectedChar.name}
                </div>
                {talkingChar === selectedChar.name && (
                  <span style={{ color: '#ffff00', fontSize: 10, animation: 'pulse 0.6s infinite' }}>
                    ◉ SPEAKING
                  </span>
                )}
              </div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                {selectedChar.title}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {talkingChar && (
                <button
                  onClick={stopSpeaking}
                  title="Stop speaking"
                  style={{
                    background: '#1a0a00', color: '#ff8800',
                    border: '1px solid #ff8800', borderRadius: 4,
                    padding: '2px 8px', fontFamily: 'monospace',
                    fontSize: 10, cursor: 'pointer'
                  }}
                >⏹</button>
              )}
              <button
                onClick={() => { stopSpeaking(); setSelectedChar(null) }}
                style={{
                  background: 'transparent', color: '#444',
                  border: '1px solid #222', borderRadius: 4,
                  padding: '2px 8px', fontFamily: 'monospace',
                  fontSize: 11, cursor: 'pointer'
                }}
              >✕</button>
            </div>
          </div>

          {/* Bio */}
          <div style={{ color: '#555', fontSize: 11, lineHeight: 1.5, borderBottom: '1px solid #111', paddingBottom: 10 }}>
            {selectedChar.bio}
          </div>

          {/* Chat history */}
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex',
            flexDirection: 'column', gap: 8,
            maxHeight: 220, minHeight: 60,
          }}>
            {history.length === 0 && (
              <div style={{ color: '#333', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                — open comms —
              </div>
            )}
            {history.map((h, i) => (
              <div key={i} style={{
                alignSelf: h.role === 'user' ? 'flex-end' : 'flex-start',
                background: h.role === 'user' ? '#0f2a4a' : '#0a1a0a',
                border: `1px solid ${h.role === 'user' ? '#1a4a8a' : '#1a3a1a'}`,
                borderRadius: 6, padding: '7px 10px',
                color: h.role === 'user' ? '#7af' : '#9f9',
                fontSize: 12, lineHeight: 1.5,
                maxWidth: '85%',
              }}>
                {h.content}
              </div>
            ))}
            {loading && (
              <div style={{ color: '#444', fontSize: 11, alignSelf: 'flex-start', animation: 'pulse 1s infinite' }}>
                {selectedChar.name} is transmitting...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          {history.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid #111', paddingTop: 8 }}>
              <div style={{ color: '#333', fontSize: 10, marginBottom: 2 }}>QUICK COMMS</div>
              {(QUICK_PROMPTS[selectedChar.name] || []).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    background: '#0a0f1a', color: '#4a8aaa',
                    border: '1px solid #1a2a3a', borderRadius: 4,
                    padding: '5px 8px', fontFamily: 'monospace',
                    fontSize: 11, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  » {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={listening ? 'Listening...' : 'Speak to mission control...'}
              style={{
                flex: 1, background: '#0a0a1a',
                border: `1px solid ${listening ? '#ff4400' : (selectedChar.color || '#1a3a6a')}`,
                borderRadius: 4, padding: '7px 10px',
                color: '#ddd', fontFamily: 'monospace',
                fontSize: 12, outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
            {voiceSupported && (
              <button
                onClick={listening ? stopListening : startListening}
                title={listening ? 'Stop listening' : 'Voice input'}
                style={{
                  background: listening ? '#3a0000' : '#0a1a0a',
                  color: listening ? '#ff4400' : '#6a6',
                  border: `1px solid ${listening ? '#ff4400' : '#1a4a1a'}`,
                  borderRadius: 4,
                  padding: '7px 10px', fontFamily: 'monospace',
                  fontSize: 14, cursor: 'pointer',
                  animation: listening ? 'pulse 1s infinite' : 'none',
                }}
              >
                🎙
              </button>
            )}
            <button
              id="send-btn"
              onClick={() => sendMessage()}
              disabled={loading}
              style={{
                background: loading ? '#111' : '#0f3460',
                color: loading ? '#333' : '#fff',
                border: 'none', borderRadius: 4,
                padding: '7px 12px', fontFamily: 'monospace',
                fontSize: 12, cursor: loading ? 'default' : 'pointer',
              }}
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        color: '#222', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1
      }}>
        CLICK A CHARACTER · DRAG TO ROTATE · SCROLL TO ZOOM
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
