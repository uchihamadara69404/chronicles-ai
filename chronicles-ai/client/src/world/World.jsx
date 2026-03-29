import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import Character from '../characters/Character'
import Player from '../characters/Player'

const CHARACTER_DEFS = [
  { id: 'eng4',  name: 'ENG-4', color: '#4a8ff0', home: [-4, 0, -4] },
  { id: 'eng5',  name: 'ENG-5', color: '#4a8ff0', home: [ 4, 0, -4] },
  { id: 'eng1',  name: 'ENG-1', color: '#4af0c0', home: [-4, 0, -1] },
  { id: 'eng2',  name: 'ENG-2', color: '#4af0c0', home: [ 0, 0, -1] },
  { id: 'eng3',  name: 'ENG-3', color: '#4af0c0', home: [ 4, 0, -1] },
  { id: 'kranz', name: 'KRANZ', color: '#ffffff', home: [ 0, 0,  3] },
]

const DESK_XS = [-8, -4, 0, 4, 8]

export default function World({
  isAlert,
  onCharacterSelect,
  selectedChar,
  talkingChar,
  charPositions,
  playerPos,
  isPlayerMoving,
  telemetry,
  o2,
  power,
  missionTime,
  timelineBranch,
  lastBroadcast,
}) {
  const alert     = isAlert
  // Normal: warm grey-white room. Alert: deep red shift.
  const floorCol  = alert ? '#2a1010' : '#2e3248'
  const wallCol   = alert ? '#1e0a0a' : '#1e2235'
  const deskCol   = alert ? '#3a1a1a' : '#3a4060'
  const platCol   = alert ? '#2e1010' : '#2c3558'
  const accentCol = alert ? '#ff5500' : '#44aaff'
  const dimAccent = alert ? '#882200' : '#2255aa'
  const pillarCol = alert ? '#1a0808' : '#1a1e30'

  return (
    <group>

      {/* ── CEILING ─────────────────────────────────────────────────────── */}
      <mesh position={[0, 3.6, -0.5]}>
        <boxGeometry args={[26, 0.15, 19]} />
        <meshLambertMaterial color={alert ? '#1a0808' : '#1a1e30'} />
      </mesh>
      {/* Ceiling recessed light strips */}
      {[-6, -2, 2, 6].map(z => (
        <mesh key={`cl${z}`} position={[0, 3.52, z]}>
          <boxGeometry args={[22, 0.04, 0.18]} />
          <meshBasicMaterial color={alert ? '#ff6633' : '#c8ddff'} />
        </mesh>
      ))}
      {/* Ceiling point lights (bright, warm white) */}
      {[[-6,-5],[-6,0],[-6,5],[0,-5],[0,0],[0,5],[6,-5],[6,0],[6,5]].map(([x,z],i) => (
        <pointLight key={`ceil${i}`} position={[x, 3.4, z]}
          color={alert ? '#ff6633' : '#ddeeff'}
          intensity={alert ? 0.6 : 1.1}
          distance={7} />
      ))}

      {/* ── FLOOR ───────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.05, -0.5]} receiveShadow>
        <boxGeometry args={[25, 0.1, 18]} />
        <meshLambertMaterial color={floorCol} />
      </mesh>
      {/* Aisle lane markings */}
      {[-8,-4,0,4,8].map(x => (
        <mesh key={`lm${x}`} position={[x, 0.115, -2.5]}>
          <boxGeometry args={[0.06, 0.02, 6]} />
          <meshBasicMaterial color={alert ? '#550000' : '#1a3060'} />
        </mesh>
      ))}
      {/* Row divider strips */}
      <FloorStrip z={-6.5} color={accentCol} />
      <FloorStrip z={-3.6} color={dimAccent} />
      <FloorStrip z={-0.2} color={dimAccent} />
      <FloorStrip z={ 1.0} color={accentCol} />
      <FloorStrip z={ 4.2} color={dimAccent} />

      {/* ── OUTER WALLS ─────────────────────────────────────────────────── */}
      {/* Back wall (behind screen) */}
      <mesh position={[0, 1.8, -9.4]}>
        <boxGeometry args={[26, 3.6, 0.4]} />
        <meshLambertMaterial color={wallCol} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 1.8, 8.4]}>
        <boxGeometry args={[26, 3.6, 0.4]} />
        <meshLambertMaterial color={wallCol} />
      </mesh>
      {/* Side walls */}
      <mesh position={[ 12.7, 1.8, -0.5]}>
        <boxGeometry args={[0.4, 3.6, 18.8]} />
        <meshLambertMaterial color={wallCol} />
      </mesh>
      <mesh position={[-12.7, 1.8, -0.5]}>
        <boxGeometry args={[0.4, 3.6, 18.8]} />
        <meshLambertMaterial color={wallCol} />
      </mesh>
      {/* Wall base skirting */}
      <mesh position={[0, 0.2, -9.2]}>
        <boxGeometry args={[25, 0.4, 0.12]} />
        <meshLambertMaterial color={dimAccent} />
      </mesh>
      <mesh position={[0, 0.2, 8.2]}>
        <boxGeometry args={[25, 0.4, 0.12]} />
        <meshLambertMaterial color={dimAccent} />
      </mesh>

      {/* Side wall panels — evenly spaced, clearly visible */}
      {[-5, -2, 1, 4].map(z => (
        <WallPanel key={`L${z}`} x={-12.5} z={z} accentCol={accentCol} wallCol={wallCol} />
      ))}
      {[-5, -2, 1, 4].map(z => (
        <WallPanel key={`R${z}`} x={ 12.5} z={z} accentCol={accentCol} wallCol={wallCol} />
      ))}

      {/* ── BIG SCREEN WALL ─────────────────────────────────────────────── */}
      {/* Backing frame */}
      <mesh position={[0, 2.1, -8.55]}>
        <boxGeometry args={[24.8, 4.2, 0.35]} />
        <meshLambertMaterial color={alert ? '#1a0505' : '#0e1120'} />
      </mesh>
      {/* Outer bezel */}
      <mesh position={[0, 2.1, -8.38]}>
        <boxGeometry args={[23.8, 4.0, 0.1]} />
        <meshLambertMaterial color={alert ? '#2a0808' : '#080c18'} />
      </mesh>

      {/* THE LIVE BIG SCREEN */}
      <BigScreen
        alert={alert}
        telemetry={telemetry}
        o2={o2}
        power={power}
        missionTime={missionTime}
        timelineBranch={timelineBranch}
        lastBroadcast={lastBroadcast}
      />

      {/* Screen frame accent bars */}
      <mesh position={[0, 4.12, -8.32]}>
        <boxGeometry args={[23.6, 0.08, 0.06]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <mesh position={[0, 0.08, -8.32]}>
        <boxGeometry args={[23.6, 0.08, 0.06]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      {[-11.8, 11.8].map((x,i)=>(
        <mesh key={`sf${i}`} position={[x, 2.1, -8.32]}>
          <boxGeometry args={[0.08, 4.0, 0.06]} /><meshBasicMaterial color={accentCol} />
        </mesh>
      ))}

      {/* Screen glow light */}
      <ScreenLight alert={alert} />

      {/* Ceiling valance above screen */}
      <mesh position={[0, 4.0, -7.8]}>
        <boxGeometry args={[24.8, 0.2, 1.6]} />
        <meshLambertMaterial color={wallCol} />
      </mesh>

      {/* ── FRONT CONSOLE ROW (z≈−5.3) ─────────────────────────────────── */}
      {DESK_XS.map(x => (
        <ConsoleDesk key={`fd${x}`} position={[x, 0, -5.3]} alert={alert} deskCol={deskCol} />
      ))}

      {/* ── BACK CONSOLE ROW (z≈−2.4) ──────────────────────────────────── */}
      {DESK_XS.map(x => (
        <ConsoleDesk key={`bd${x}`} position={[x, 0, -2.4]} alert={alert} deskCol={deskCol} />
      ))}

      {/* ── KRANZ PLATFORM ──────────────────────────────────────────────── */}
      <mesh position={[0, 0.17, 2.5]} receiveShadow>
        <boxGeometry args={[21, 0.34, 3.4]} />
        <meshLambertMaterial color={platCol} />
      </mesh>
      {/* Platform edge lights */}
      <mesh position={[0, 0.36, 1.0]}>
        <boxGeometry args={[21, 0.06, 0.06]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <mesh position={[0, 0.36, 4.0]}>
        <boxGeometry args={[21, 0.06, 0.06]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Platform rails */}
      <mesh position={[-10.5, 0.6, 2.5]}>
        <boxGeometry args={[0.07, 0.5, 3.4]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <mesh position={[ 10.5, 0.6, 2.5]}>
        <boxGeometry args={[0.07, 0.5, 3.4]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <CommandDesk position={[0, 0.34, 2.1]} alert={alert} deskCol={deskCol} />
      <pointLight position={[0, 1.5, 2.5]}
        color={alert ? '#ff5500' : '#66aaff'}
        intensity={alert ? 0.9 : 0.5}
        distance={10} />

      {/* ── PILLARS ─────────────────────────────────────────────────────── */}
      {[-11, 11].map(x => (
        [-6, 0].map(z => (
          <Pillar key={`p${x}${z}`} position={[x, 0, z]} pillarCol={pillarCol} accentCol={accentCol} />
        ))
      ))}

      {/* ── CHARACTERS ──────────────────────────────────────────────────── */}
      {CHARACTER_DEFS.map(c => {
        const pos = charPositions?.[c.name] ?? c.home
        return (
          <Character
            key={c.id}
            position={pos}
            color={c.color}
            name={c.name}
            onSelect={onCharacterSelect}
            isSelected={selectedChar?.name === c.name}
            isAlert={isAlert}
            isTalking={talkingChar === c.name}
          />
        )
      })}

      <Player position={playerPos} isMoving={isPlayerMoving} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BIG SCREEN — live mission data display
// ─────────────────────────────────────────────────────────────────────────────
function BigScreen({ alert, telemetry, o2, power, missionTime, timelineBranch, lastBroadcast }) {
  const screenRef = useRef()
  const scanRef   = useRef()

  useFrame(({ clock }) => {
    // Subtle screen pulse
    if (screenRef.current) {
      const base = alert ? 0.85 : 0.55
      screenRef.current.material.color.setStyle(
        alert
          ? `hsl(10, 90%, ${(base + Math.sin(clock.elapsedTime * 1.2) * 0.04) * 100}%)`
          : `hsl(220, 80%, ${(base + Math.sin(clock.elapsedTime * 0.6) * 0.03) * 30}%)`
      )
    }
    // Scan line moves top to bottom
    if (scanRef.current) {
      const y = 1.8 - ((clock.elapsedTime * 0.6) % 3.6)
      scanRef.current.position.y = y
      scanRef.current.material.opacity = 0.08 + Math.sin(clock.elapsedTime * 2) * 0.03
    }
  })

  const formatTime = (secs) => {
    const base = 55 * 3600 + 55 * 60 + 20
    const total = base + (secs || 0)
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `T+${h}:${m}:${s}`
  }

  const telem = telemetry || { alt: 199340, vel: 1.53, co2: 2.5, temp: 21.0, batt: 29.5 }
  const o2v   = o2    ?? 100
  const pwrv  = power ?? 100
  const mt    = missionTime ?? 0
  const branch = timelineBranch ?? 'A'

  const statusText = alert
    ? (o2v < 30  ? 'CRITICAL — O2 DEPLETING'   :
       pwrv < 30 ? 'CRITICAL — POWER FAILURE'  :
       telem.co2 > 7 ? 'DANGER — CO2 RISING'   :
       'CONTINGENCY DECLARED')
    : 'MISSION NOMINAL'

  const BRANCH_LABELS = { A:'NOMINAL', B:'SKIP-OUT', C:'CO2/BURNUP', D:'POWER FAIL' }

  // Text positioning within 3-panel screen. Each panel is 7.2 wide × 3.3 tall.
  // Panels at x = -7.6, 0, +7.6 ; z = -8.28 (just in front of bezel)
  const Z = -8.28
  const panelW = 7.0
  const col = (p) => [-7.6, 0, 7.6][p]

  // Bar helper (renders as thin box mesh)
  const barW = (val, max, fullW) => Math.max(0.05, (val / max) * fullW)

  return (
    <group>
      {/* ── Full-width screen background ── */}
      <mesh ref={screenRef} position={[0, 2.1, Z - 0.01]}>
        <boxGeometry args={[23.4, 3.8, 0.02]} />
        <meshBasicMaterial color={alert ? '#200400' : '#000c1e'} />
      </mesh>

      {/* Moving scan line */}
      <mesh ref={scanRef} position={[0, 0, Z + 0.01]}>
        <boxGeometry args={[23.4, 0.04, 0.01]} />
        <meshBasicMaterial color={alert ? '#ff4400' : '#4488ff'} transparent opacity={0.08} />
      </mesh>

      {/* ─── PANEL LEFT — STATUS & TRAJECTORY ─────────────────────── */}
      {/* Header bar */}
      <mesh position={[col(0), 3.62, Z]}>
        <boxGeometry args={[7.0, 0.22, 0.02]} />
        <meshBasicMaterial color={alert ? '#aa2200' : '#0a2a55'} />
      </mesh>
      <Text position={[col(0), 3.62, Z+0.02]} fontSize={0.16} color={alert?'#ff9966':'#88ccff'} anchorX="center" anchorY="middle" fontWeight="bold">
        TRAJECTORY / STATUS
      </Text>

      {/* Status */}
      <Text position={[col(0), 3.28, Z+0.01]} fontSize={0.18} color={alert?'#ff4400':'#4af0c0'} anchorX="center" anchorY="middle">
        {statusText}
      </Text>

      {/* MET */}
      <Text position={[col(0)-2.9, 2.92, Z+0.01]} fontSize={0.13} color="#8899bb" anchorX="left" anchorY="middle">MET</Text>
      <Text position={[col(0)+2.9, 2.92, Z+0.01]} fontSize={0.15} color={alert?'#ffaa88':'#ccddff'} anchorX="right" anchorY="middle">{formatTime(mt)}</Text>

      {/* Altitude */}
      <Text position={[col(0)-2.9, 2.60, Z+0.01]} fontSize={0.13} color="#8899bb" anchorX="left" anchorY="middle">ALTITUDE</Text>
      <Text position={[col(0)+2.9, 2.60, Z+0.01]} fontSize={0.15} color="#aaccff" anchorX="right" anchorY="middle">{telem.alt.toFixed(0)} km</Text>

      {/* Velocity */}
      <Text position={[col(0)-2.9, 2.28, Z+0.01]} fontSize={0.13} color="#8899bb" anchorX="left" anchorY="middle">VELOCITY</Text>
      <Text position={[col(0)+2.9, 2.28, Z+0.01]} fontSize={0.15} color="#aaccff" anchorX="right" anchorY="middle">{telem.vel.toFixed(3)} km/s</Text>

      {/* Timeline */}
      <Text position={[col(0)-2.9, 1.96, Z+0.01]} fontSize={0.13} color="#8899bb" anchorX="left" anchorY="middle">TIMELINE</Text>
      <Text position={[col(0)+2.9, 1.96, Z+0.01]} fontSize={0.15}
        color={branch==='A'?'#4af0c0':branch==='B'?'#ff4400':'#ff8800'}
        anchorX="right" anchorY="middle">
        {BRANCH_LABELS[branch] ?? branch}
      </Text>

      {/* Divider */}
      <mesh position={[col(0), 1.78, Z+0.01]}><boxGeometry args={[6.6, 0.015, 0.01]} /><meshBasicMaterial color={alert?'#441100':'#112244'} /></mesh>

      {/* Trajectory bar — velocity vs nominal (max 2.5 km/s) */}
      <Text position={[col(0)-2.9, 1.58, Z+0.01]} fontSize={0.12} color="#667799" anchorX="left" anchorY="middle">VELOCITY BAR</Text>
      {/* bar bg */}
      <mesh position={[col(0), 1.40, Z+0.01]}><boxGeometry args={[6.0, 0.14, 0.01]} /><meshBasicMaterial color="#0a0c14" /></mesh>
      {/* bar fill */}
      <mesh position={[col(0) - 3.0 + barW(Math.min(telem.vel, 2.5), 2.5, 6.0)/2, 1.40, Z+0.02]}>
        <boxGeometry args={[barW(Math.min(telem.vel, 2.5), 2.5, 6.0), 0.12, 0.01]} />
        <meshBasicMaterial color={telem.vel > 2.0 ? '#ff4400' : '#4488ff'} />
      </mesh>

      {/* Last broadcast */}
      <mesh position={[col(0), 0.92, Z+0.01]}><boxGeometry args={[6.6, 0.015, 0.01]} /><meshBasicMaterial color={alert?'#441100':'#112244'} /></mesh>
      <Text position={[col(0), 0.72, Z+0.01]} fontSize={0.11} color="#445566" anchorX="center" anchorY="middle">LAST COMMS</Text>
      <Text
        position={[col(0), 0.46, Z+0.01]}
        fontSize={0.115}
        color={alert ? '#ff8866' : '#6699bb'}
        anchorX="center" anchorY="middle"
        maxWidth={6.6}
        overflowWrap="break-word"
      >
        {lastBroadcast ? `${lastBroadcast.char}: ${lastBroadcast.text.slice(0, 72)}${lastBroadcast.text.length > 72 ? '…' : ''}` : '— NOMINAL —'}
      </Text>

      {/* ─── PANEL CENTER — SYSTEMS GAUGES ─────────────────────────── */}
      <mesh position={[col(1), 3.62, Z]}>
        <boxGeometry args={[7.0, 0.22, 0.02]} />
        <meshBasicMaterial color={alert ? '#aa2200' : '#0a2a55'} />
      </mesh>
      <Text position={[col(1), 3.62, Z+0.02]} fontSize={0.16} color={alert?'#ff9966':'#88ccff'} anchorX="center" anchorY="middle" fontWeight="bold">
        SYSTEMS STATUS
      </Text>

      {/* O2 */}
      <Text position={[col(1)-2.9, 3.28, Z+0.01]} fontSize={0.14} color="#8899bb" anchorX="left" anchorY="middle">O₂ SUPPLY</Text>
      <Text position={[col(1)+2.9, 3.28, Z+0.01]} fontSize={0.15}
        color={o2v>60?'#4af0c0':o2v>30?'#ffaa00':'#ff3300'} anchorX="right" anchorY="middle">{o2v.toFixed(1)}%</Text>
      {/* O2 bar bg */}
      <mesh position={[col(1), 3.10, Z+0.01]}><boxGeometry args={[6.0, 0.14, 0.01]} /><meshBasicMaterial color="#0a0c14" /></mesh>
      {/* O2 bar fill */}
      <mesh position={[col(1) - 3.0 + barW(o2v,100,6.0)/2, 3.10, Z+0.02]}>
        <boxGeometry args={[barW(o2v,100,6.0), 0.12, 0.01]} />
        <meshBasicMaterial color={o2v>60?'#4af0c0':o2v>30?'#ffaa00':'#ff3300'} />
      </mesh>

      {/* POWER */}
      <Text position={[col(1)-2.9, 2.82, Z+0.01]} fontSize={0.14} color="#8899bb" anchorX="left" anchorY="middle">POWER</Text>
      <Text position={[col(1)+2.9, 2.82, Z+0.01]} fontSize={0.15}
        color={pwrv>60?'#4af0c0':pwrv>30?'#ffaa00':'#ff3300'} anchorX="right" anchorY="middle">{pwrv.toFixed(1)}%</Text>
      <mesh position={[col(1), 2.64, Z+0.01]}><boxGeometry args={[6.0, 0.14, 0.01]} /><meshBasicMaterial color="#0a0c14" /></mesh>
      <mesh position={[col(1) - 3.0 + barW(pwrv,100,6.0)/2, 2.64, Z+0.02]}>
        <boxGeometry args={[barW(pwrv,100,6.0), 0.12, 0.01]} />
        <meshBasicMaterial color={pwrv>60?'#4af0c0':pwrv>30?'#ffaa00':'#ff3300'} />
      </mesh>

      {/* CO2 */}
      <Text position={[col(1)-2.9, 2.36, Z+0.01]} fontSize={0.14} color="#8899bb" anchorX="left" anchorY="middle">CO₂ (mmHg)</Text>
      <Text position={[col(1)+2.9, 2.36, Z+0.01]} fontSize={0.15}
        color={telem.co2<4?'#4af0c0':telem.co2<7?'#ffaa00':'#ff3300'} anchorX="right" anchorY="middle">{telem.co2.toFixed(1)}</Text>
      <mesh position={[col(1), 2.18, Z+0.01]}><boxGeometry args={[6.0, 0.14, 0.01]} /><meshBasicMaterial color="#0a0c14" /></mesh>
      <mesh position={[col(1) - 3.0 + barW(Math.min(telem.co2, 15), 15, 6.0)/2, 2.18, Z+0.02]}>
        <boxGeometry args={[barW(Math.min(telem.co2, 15), 15, 6.0), 0.12, 0.01]} />
        <meshBasicMaterial color={telem.co2<4?'#4af0c0':telem.co2<7?'#ffaa00':'#ff3300'} />
      </mesh>

      {/* TEMP */}
      <Text position={[col(1)-2.9, 1.90, Z+0.01]} fontSize={0.14} color="#8899bb" anchorX="left" anchorY="middle">CABIN TEMP</Text>
      <Text position={[col(1)+2.9, 1.90, Z+0.01]} fontSize={0.15}
        color={telem.temp>15?'#4af0c0':telem.temp>10?'#ffaa00':'#4af'} anchorX="right" anchorY="middle">{telem.temp.toFixed(1)}°C</Text>
      <mesh position={[col(1), 1.72, Z+0.01]}><boxGeometry args={[6.0, 0.14, 0.01]} /><meshBasicMaterial color="#0a0c14" /></mesh>
      <mesh position={[col(1) - 3.0 + barW(Math.max(0,telem.temp), 35, 6.0)/2, 1.72, Z+0.02]}>
        <boxGeometry args={[barW(Math.max(0,telem.temp), 35, 6.0), 0.12, 0.01]} />
        <meshBasicMaterial color={telem.temp>15?'#4af0c0':telem.temp>10?'#ffaa00':'#4af'} />
      </mesh>

      {/* BATTERY */}
      <Text position={[col(1)-2.9, 1.44, Z+0.01]} fontSize={0.14} color="#8899bb" anchorX="left" anchorY="middle">BATTERY (V)</Text>
      <Text position={[col(1)+2.9, 1.44, Z+0.01]} fontSize={0.15}
        color={telem.batt>25?'#4af0c0':telem.batt>20?'#ffaa00':'#ff3300'} anchorX="right" anchorY="middle">{telem.batt.toFixed(1)}</Text>
      <mesh position={[col(1), 1.26, Z+0.01]}><boxGeometry args={[6.0, 0.14, 0.01]} /><meshBasicMaterial color="#0a0c14" /></mesh>
      <mesh position={[col(1) - 3.0 + barW(telem.batt, 30, 6.0)/2, 1.26, Z+0.02]}>
        <boxGeometry args={[barW(telem.batt, 30, 6.0), 0.12, 0.01]} />
        <meshBasicMaterial color={telem.batt>25?'#4af0c0':telem.batt>20?'#ffaa00':'#ff3300'} />
      </mesh>

      {/* Crew status */}
      <mesh position={[col(1), 0.95, Z+0.01]}><boxGeometry args={[6.6, 0.015, 0.01]} /><meshBasicMaterial color={alert?'#441100':'#112244'} /></mesh>
      <Text position={[col(1), 0.72, Z+0.01]} fontSize={0.14} color="#8899bb" anchorX="center" anchorY="middle">CREW STATUS</Text>
      <Text position={[col(1), 0.46, Z+0.01]} fontSize={0.20}
        color={alert ? (o2v<30||pwrv<30?'#ff3300':'#ff8800') : '#4af0c0'}
        anchorX="center" anchorY="middle">
        {alert ? (o2v<30||pwrv<30 ? '⚠ CRITICAL' : '⚠ AT RISK') : '✓ NOMINAL'}
      </Text>

      {/* ─── PANEL RIGHT — MISSION LOG / EVENTS ────────────────────── */}
      <mesh position={[col(2), 3.62, Z]}>
        <boxGeometry args={[7.0, 0.22, 0.02]} />
        <meshBasicMaterial color={alert ? '#aa2200' : '#0a2a55'} />
      </mesh>
      <Text position={[col(2), 3.62, Z+0.02]} fontSize={0.16} color={alert?'#ff9966':'#88ccff'} anchorX="center" anchorY="middle" fontWeight="bold">
        MISSION CONTROL
      </Text>

      {/* APOLLO 13 title */}
      <Text position={[col(2), 3.20, Z+0.01]} fontSize={0.26}
        color={alert ? '#ff5500' : '#3399ff'}
        anchorX="center" anchorY="middle" fontWeight="bold">
        APOLLO 13
      </Text>
      <Text position={[col(2), 2.88, Z+0.01]} fontSize={0.14} color="#667799" anchorX="center" anchorY="middle">
        HOUSTON, TEXAS  ·  APRIL 13, 1970
      </Text>

      <mesh position={[col(2), 2.66, Z+0.01]}><boxGeometry args={[6.6, 0.015, 0.01]} /><meshBasicMaterial color={alert?'#441100':'#112244'} /></mesh>

      {/* Phase */}
      <Text position={[col(2)-2.9, 2.46, Z+0.01]} fontSize={0.13} color="#667799" anchorX="left" anchorY="middle">PHASE</Text>
      <Text position={[col(2)+2.9, 2.46, Z+0.01]} fontSize={0.14}
        color={alert?'#ff8866':'#88ccff'} anchorX="right" anchorY="middle">
        {alert ? 'CONTINGENCY' : 'TRANS-LUNAR'}
      </Text>

      {/* Mission time display */}
      <Text position={[col(2)-2.9, 2.16, Z+0.01]} fontSize={0.13} color="#667799" anchorX="left" anchorY="middle">T+ (ELAPSED)</Text>
      <Text position={[col(2)+2.9, 2.16, Z+0.01]} fontSize={0.14} color={alert?'#ffaa88':'#ccddff'} anchorX="right" anchorY="middle">
        {String(Math.floor(mt/3600)).padStart(2,'0')}h {String(Math.floor((mt%3600)/60)).padStart(2,'0')}m {String(mt%60).padStart(2,'0')}s
      </Text>

      {/* Event log lines */}
      <mesh position={[col(2), 1.94, Z+0.01]}><boxGeometry args={[6.6, 0.015, 0.01]} /><meshBasicMaterial color={alert?'#441100':'#112244'} /></mesh>
      <Text position={[col(2), 1.74, Z+0.01]} fontSize={0.12} color="#445566" anchorX="center" anchorY="middle">ACTIVE ALERTS</Text>

      {/* Dynamic alert lines */}
      {[
        alert && telem.co2 > 7   ? '⚠ CO2 CRITICAL — SCRUBBER SAT.'  : null,
        alert && o2v < 40        ? '⚠ O2 BELOW 40% — CONSERVE'       : null,
        alert && pwrv < 40       ? '⚠ POWER < 40% — SHED LOAD NOW'   : null,
        alert && telem.temp < 12 ? '⚠ CABIN TEMP DROPPING'           : null,
        alert && telem.batt < 22 ? '⚠ BATTERY LOW — CHECK CELLS'     : null,
        !alert                   ? '✓ ALL SYSTEMS NOMINAL'            : null,
        !alert                   ? '✓ TRAJECTORY CONFIRMED'           : null,
      ].filter(Boolean).slice(0, 4).map((line, i) => (
        <Text key={i}
          position={[col(2), 1.46 - i * 0.28, Z+0.01]}
          fontSize={0.13}
          color={line.startsWith('⚠') ? '#ff6633' : '#4af0c0'}
          anchorX="center" anchorY="middle"
          maxWidth={6.6}
        >
          {line}
        </Text>
      ))}

      {/* Bottom watermark */}
      <Text position={[col(2), 0.26, Z+0.01]} fontSize={0.11} color={alert?'#441100':'#0d1828'} anchorX="center" anchorY="middle">
        NASA MANNED SPACECRAFT CENTER  ·  CHRONICLES AI
      </Text>

    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FloorStrip({ z, color }) {
  return (
    <mesh position={[0, 0.116, z]}>
      <boxGeometry args={[25, 0.025, 0.07]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function WallPanel({ x, z, accentCol, wallCol }) {
  const rot = x < 0 ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0]
  return (
    <group position={[x, 1.1, z]}>
      {/* Panel body */}
      <mesh rotation={rot}>
        <boxGeometry args={[2.0, 1.6, 0.1]} />
        <meshLambertMaterial color={wallCol} />
      </mesh>
      {/* Top accent bar */}
      <mesh position={[0, 0.72, 0]} rotation={rot}>
        <boxGeometry args={[1.8, 0.06, 0.14]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Bottom accent bar */}
      <mesh position={[0, -0.72, 0]} rotation={rot}>
        <boxGeometry args={[1.8, 0.06, 0.14]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
    </group>
  )
}

function Pillar({ position, pillarCol, accentCol }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[0.35, 3.5, 0.35]} />
        <meshLambertMaterial color={pillarCol} />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 3.52, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Mid-band */}
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[0.38, 0.06, 0.38]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
    </group>
  )
}

function ScreenLight({ alert }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.intensity = (alert ? 2.0 : 1.2) + Math.sin(clock.elapsedTime * 0.4) * 0.1
    }
  })
  return (
    <pointLight
      ref={ref}
      position={[0, 2.2, -6.0]}
      color={alert ? '#ff5500' : '#4488ff'}
      distance={12}
    />
  )
}

function ConsoleDesk({ position, alert, deskCol }) {
  const monBg     = alert ? '#2a0800' : '#001a28'
  const glowColor = alert ? '#ff5500' : '#00ccff'
  const accentCol = alert ? '#ff5500' : '#44aaff'

  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh castShadow receiveShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[3.5, 0.14, 0.9]} />
        <meshLambertMaterial color={deskCol} />
      </mesh>
      {/* Front panel */}
      <mesh position={[0, -0.26, 0.46]}>
        <boxGeometry args={[3.5, 0.52, 0.07]} />
        <meshLambertMaterial color={alert ? '#2e1010' : '#253050'} />
      </mesh>
      {/* Legs */}
      {[-1.55, 1.55].map((x, i) => (
        <mesh key={i} position={[x, -0.34, 0]}>
          <boxGeometry args={[0.12, 0.68, 0.72]} />
          <meshLambertMaterial color={alert ? '#1e0808' : '#1e2540'} />
        </mesh>
      ))}
      {/* Monitors */}
      {[-1.1, 0, 1.1].map((x, i) => (
        <group key={i} position={[x, 0.44, -0.18]} rotation={[-0.3, 0, 0]}>
          {/* Screen */}
          <mesh><boxGeometry args={[0.9, 0.58, 0.05]} /><meshBasicMaterial color={monBg} /></mesh>
          {/* Bezel */}
          <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.98, 0.66, 0.04]} /><meshLambertMaterial color="#0a0c14" /></mesh>
          {/* Glow line */}
          <mesh position={[0, 0.31, 0.04]}><boxGeometry args={[0.82, 0.028, 0.02]} /><meshBasicMaterial color={glowColor} /></mesh>
        </group>
      ))}
      {/* Keyboard */}
      <mesh position={[0, 0.14, 0.22]}>
        <boxGeometry args={[2.6, 0.05, 0.32]} />
        <meshLambertMaterial color={alert ? '#120808' : '#0c1428'} />
      </mesh>
      {/* Front edge accent */}
      <mesh position={[0, 0.01, 0.47]}>
        <boxGeometry args={[3.5, 0.05, 0.05]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Under-desk glow */}
      <pointLight position={[0, -0.1, 0.2]} color={accentCol} intensity={0.3} distance={2.5} />
    </group>
  )
}

function CommandDesk({ position, alert, deskCol }) {
  const monBg     = alert ? '#200500' : '#001830'
  const glowColor = alert ? '#ff5500' : '#00ccff'
  const accentCol = alert ? '#ff5500' : '#44aaff'

  return (
    <group position={position}>
      {/* Surface */}
      <mesh castShadow receiveShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[6, 0.14, 1.1]} />
        <meshLambertMaterial color={deskCol} />
      </mesh>
      {/* Front panel */}
      <mesh position={[0, -0.30, 0.58]}>
        <boxGeometry args={[6, 0.60, 0.09]} />
        <meshLambertMaterial color={alert ? '#2e1010' : '#253050'} />
      </mesh>
      {/* Legs */}
      {[-2.7, 0, 2.7].map((x, i) => (
        <mesh key={i} position={[x, -0.42, 0]}>
          <boxGeometry args={[0.14, 0.84, 0.82]} />
          <meshLambertMaterial color={alert ? '#1e0808' : '#1e2540'} />
        </mesh>
      ))}
      {/* Center monitor */}
      <group position={[0, 0.62, -0.22]} rotation={[-0.35, 0, 0]}>
        <mesh><boxGeometry args={[2.4, 0.75, 0.06]} /><meshBasicMaterial color={monBg} /></mesh>
        <mesh position={[0, 0, 0.04]}><boxGeometry args={[2.52, 0.87, 0.04]} /><meshLambertMaterial color="#040608" /></mesh>
        <mesh position={[0, 0.38, 0.05]}><boxGeometry args={[2.2, 0.03, 0.02]} /><meshBasicMaterial color={glowColor} /></mesh>
      </group>
      {/* Side monitors */}
      {[-2.0, 2.0].map((x, i) => (
        <group key={i} position={[x, 0.48, -0.14]} rotation={[-0.3, 0, 0]}>
          <mesh><boxGeometry args={[1.2, 0.62, 0.05]} /><meshBasicMaterial color={monBg} /></mesh>
          <mesh position={[0, 0, 0.03]}><boxGeometry args={[1.3, 0.72, 0.04]} /><meshLambertMaterial color="#040608" /></mesh>
        </group>
      ))}
      {/* Keyboard */}
      <mesh position={[0, 0.15, 0.28]}>
        <boxGeometry args={[3.5, 0.05, 0.38]} />
        <meshLambertMaterial color={alert ? '#120808' : '#0c1428'} />
      </mesh>
      {/* Accent strip */}
      <mesh position={[0, 0.02, 0.59]}>
        <boxGeometry args={[6, 0.05, 0.05]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Under-desk glow */}
      <pointLight position={[0, 0.3, 0.3]} color={accentCol} intensity={0.55} distance={5} />
    </group>
  )
}
