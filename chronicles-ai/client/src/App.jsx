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
    <div className="app-root" style={{ background: isAlert ? '#0d0000' : '#0a0a1a' }}>
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
      <div className="topbar" style={{ borderBottom: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}` }}>
        <span className="topbar-title" style={{ color: isAlert ? '#ff4400' : '#4af' }}>
          CHRONICLES AI · APOLLO 13 · 1970
        </span>
        <span className="topbar-clock">
          {formatMissionTime(missionTime)}
        </span>
        <button
          className="crisis-btn"
          onClick={handleCrisisToggle}
          style={{ background: isAlert ? '#ff4400' : '#1a3a6a' }}
        >
          {isAlert ? '⚠ CRISIS' : 'TRIGGER CRISIS'}
        </button>
      </div>

      {/* Mission status HUD */}
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

      {/* Chat panel */}
      {selectedChar && (
        <div
          className="chat-panel"
          style={{
            border: `1px solid ${talkingChar === selectedChar.name ? '#ffff00' : (selectedChar.color || '#4af')}`,
            boxShadow: talkingChar === selectedChar.name ? '0 0 16px rgba(255,255,0,0.15)' : 'none',
          }}
        >
          {/* Header */}
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

          {/* Bio */}
          <div className="chat-bio">{selectedChar.bio}</div>

          {/* History */}
          <div className="chat-history">
            {history.length === 0 && (
              <div className="chat-empty">— open comms —</div>
            )}
            {history.map((h, i) => (
              <div key={i} className={`chat-bubble ${h.role}`} style={{
                background: h.role === 'user' ? '#0f2a4a' : '#0a1a0a',
                border: `1px solid ${h.role === 'user' ? '#1a4a8a' : '#1a3a1a'}`,
                color: h.role === 'user' ? '#7af' : '#9f9',
              }}>
                {h.content}
              </div>
            ))}
            {loading && (
              <div className="chat-loading">{selectedChar.name} is transmitting...</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          {history.length === 0 && (
            <div className="quick-prompts">
              <div className="quick-label">QUICK COMMS</div>
              {(QUICK_PROMPTS[selectedChar.name] || []).map((q) => (
                <button key={q} className="quick-btn" onClick={() => sendMessage(q)}>» {q}</button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={listening ? 'Listening...' : 'Speak to mission control...'}
              style={{
                border: `1px solid ${listening ? '#ff4400' : (selectedChar.color || '#1a3a6a')}`,
              }}
            />
            {voiceSupported && (
              <button
                className="btn-mic"
                onClick={listening ? stopListening : startListening}
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

      {/* Bottom hint */}
      <div className="bottom-hint">
        CLICK A CHARACTER · DRAG TO ROTATE · SCROLL TO ZOOM
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .app-root {
          position: fixed;
          inset: 0;
          overflow: hidden;
          font-family: monospace;
        }

        /* Top bar */
        .topbar {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: rgba(0,0,0,0.75);
          z-index: 10;
          flex-wrap: nowrap;
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
        .crisis-btn {
          flex-shrink: 0;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 5px clamp(8px, 1.5vw, 16px);
          font-family: monospace;
          font-size: clamp(9px, 1.5vw, 12px);
          letter-spacing: 1px;
          cursor: pointer;
          white-space: nowrap;
        }

        /* HUD */
        .hud {
          position: absolute;
          top: calc(44px + 8px);
          right: 12px;
          font-size: clamp(9px, 1.5vw, 11px);
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0,0,0,0.65);
          border-radius: 6px;
          padding: 8px 10px;
          width: clamp(130px, 22vw, 165px);
          z-index: 10;
        }
        .hud-label { color: #555; letter-spacing: 1px; }
        .hud-row { display: flex; flex-direction: column; gap: 3px; }
        .hud-row-header { display: flex; justify-content: space-between; }
        .hud-bar-bg { background: #111; border-radius: 2px; height: 4px; overflow: hidden; }
        .hud-bar-fill { height: 100%; transition: width 0.5s, background 0.5s; }
        .hud-crew { color: #333; }

        /* Chat panel */
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
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }
        .chat-char-name-row { display: flex; align-items: center; gap: 8px; }
        .chat-char-name { font-size: clamp(12px, 2vw, 15px); font-weight: bold; }
        .speaking-badge { color: #ffff00; font-size: 10px; animation: pulse 0.6s infinite; }
        .chat-char-title { color: #666; font-size: clamp(9px, 1.5vw, 11px); margin-top: 2px; }
        .chat-header-btns { display: flex; gap: 5px; flex-shrink: 0; }

        .btn-stop {
          background: #1a0a00; color: #ff8800;
          border: 1px solid #ff8800; border-radius: 4px;
          padding: 2px 7px; font-family: monospace;
          font-size: 10px; cursor: pointer;
        }
        .btn-close {
          background: transparent; color: #444;
          border: 1px solid #222; border-radius: 4px;
          padding: 2px 7px; font-family: monospace;
          font-size: 11px; cursor: pointer;
        }

        .chat-bio {
          color: #555;
          font-size: clamp(10px, 1.5vw, 11px);
          line-height: 1.5;
          border-bottom: 1px solid #111;
          padding-bottom: 8px;
          flex-shrink: 0;
        }

        .chat-history {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 48px;
          max-height: 36vh;
        }
        .chat-empty { color: #333; font-size: 11px; text-align: center; margin-top: 8px; }
        .chat-bubble {
          border-radius: 6px;
          padding: 6px 9px;
          font-size: clamp(11px, 1.8vw, 12px);
          line-height: 1.5;
          max-width: 85%;
          word-break: break-word;
        }
        .chat-bubble.user { align-self: flex-end; }
        .chat-bubble.assistant { align-self: flex-start; }
        .chat-loading { color: #444; font-size: 11px; align-self: flex-start; animation: pulse 1s infinite; }

        .quick-prompts {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-top: 1px solid #111;
          padding-top: 6px;
          flex-shrink: 0;
        }
        .quick-label { color: #333; font-size: 10px; margin-bottom: 2px; }
        .quick-btn {
          background: #0a0f1a; color: #4a8aaa;
          border: 1px solid #1a2a3a; border-radius: 4px;
          padding: 5px 8px; font-family: monospace;
          font-size: clamp(10px, 1.6vw, 11px); cursor: pointer; text-align: left;
        }

        .chat-input-row {
          display: flex;
          gap: 5px;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          background: #0a0a1a;
          border-radius: 4px;
          padding: 7px 9px;
          color: #ddd;
          font-family: monospace;
          font-size: clamp(11px, 1.8vw, 12px);
          outline: none;
          transition: border-color 0.2s;
          min-width: 0;
        }
        .btn-mic {
          border-radius: 4px;
          padding: 7px 9px;
          font-family: monospace;
          font-size: 14px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .btn-send {
          border: none;
          border-radius: 4px;
          padding: 7px 11px;
          font-family: monospace;
          font-size: 12px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .btn-send:disabled { cursor: default; }

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

        /* Responsive: on narrow screens, chat panel takes more width and HUD compresses */
        @media (max-width: 480px) {
          .chat-panel {
            left: 8px;
            right: 8px;
            width: auto;
            bottom: 8px;
          }
          .hud { display: none; }
          .topbar-title { display: none; }
          .bottom-hint { display: none; }
        }

        @media (max-width: 768px) and (min-width: 481px) {
          .chat-panel {
            width: clamp(260px, 50vw, 340px);
          }
          .hud { width: clamp(120px, 18vw, 150px); font-size: 10px; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
