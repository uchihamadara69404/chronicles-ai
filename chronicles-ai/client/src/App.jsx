import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import World from './world/World'

const API = '/api'

export default function App() {
  const [selectedChar, setSelectedChar] = useState(null)
  const [isAlert, setIsAlert] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleSelect = (char) => {
    setSelectedChar(char)
    setHistory([])
    setMessage('')
  }

  const sendMessage = async () => {
    if (!message.trim() || loading) return
    const userMsg = { role: 'user', content: message }
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
          message: message,
          history: history,
        }),
      })
      const data = await res.json()
      setHistory([...newHistory, { role: 'assistant', content: data.response }])
    } catch (e) {
      setHistory([...newHistory, { role: 'assistant', content: '[COMMS FAILURE]' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: isAlert ? '#0d0000' : '#0a0a1a' }}>
      <Canvas camera={{ position: [0, 14, 10], fov: 50 }} shadows>
        <ambientLight intensity={isAlert ? 0.2 : 0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <pointLight position={[0, 5, 0]} color={isAlert ? '#ff0000' : '#4466ff'} intensity={isAlert ? 1.5 : 0.3} />
        <World isAlert={isAlert} onCharacterSelect={handleSelect} selectedChar={selectedChar} />
        <OrbitControls maxPolarAngle={Math.PI / 2.8} minDistance={8} maxDistance={25} />
      </Canvas>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: `1px solid ${isAlert ? '#ff4400' : '#1a3a6a'}`,
      }}>
        <span style={{ color: isAlert ? '#ff4400' : '#4af', fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>
          CHRONICLES AI · APOLLO 13 · 1970
        </span>
        <button
          onClick={() => { setIsAlert(a => !a); setSelectedChar(null) }}
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

      {/* Chat panel */}
      {selectedChar && (
        <div style={{
          position: 'absolute', bottom: 40, left: 30,
          background: 'rgba(5,5,20,0.95)',
          border: `1px solid ${selectedChar.color || '#4af'}`,
          borderRadius: 8, padding: '16px',
          width: 320, fontFamily: 'monospace',
          display: 'flex', flexDirection: 'column', gap: 10,
          maxHeight: '60vh',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: selectedChar.color || '#4af', fontSize: 15, fontWeight: 'bold' }}>
                {selectedChar.name}
              </div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                {selectedChar.title}
              </div>
            </div>
            <button
              onClick={() => setSelectedChar(null)}
              style={{
                background: 'transparent', color: '#444',
                border: '1px solid #222', borderRadius: 4,
                padding: '2px 8px', fontFamily: 'monospace',
                fontSize: 11, cursor: 'pointer'
              }}
            >✕</button>
          </div>

          {/* Bio */}
          <div style={{ color: '#555', fontSize: 11, lineHeight: 1.5, borderBottom: '1px solid #111', paddingBottom: 10 }}>
            {selectedChar.bio}
          </div>

          {/* Chat history */}
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex',
            flexDirection: 'column', gap: 8,
            maxHeight: 240, minHeight: 60,
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
              <div style={{ color: '#444', fontSize: 11, alignSelf: 'flex-start' }}>
                {selectedChar.name} is thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Speak to mission control..."
              style={{
                flex: 1, background: '#0a0a1a',
                border: `1px solid ${selectedChar.color || '#1a3a6a'}`,
                borderRadius: 4, padding: '7px 10px',
                color: '#ddd', fontFamily: 'monospace',
                fontSize: 12, outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
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
    </div>
  )
}
