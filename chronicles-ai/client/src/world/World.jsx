import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Character from '../characters/Character'
import Player from '../characters/Player'

// ── Map is 25 wide × 18 tall, offsets: x=−12, z=−9 ─────────────────────────
// World coords: x = tile_x − 12,  z = tile_z − 9

const CHARACTER_DEFS = [
  { id: 'eng4',  name: 'ENG-4', color: '#4a8ff0', home: [-4, 0, -4] },
  { id: 'eng5',  name: 'ENG-5', color: '#4a8ff0', home: [ 4, 0, -4] },
  { id: 'eng1',  name: 'ENG-1', color: '#4af0c0', home: [-4, 0, -1] },
  { id: 'eng2',  name: 'ENG-2', color: '#4af0c0', home: [ 0, 0, -1] },
  { id: 'eng3',  name: 'ENG-3', color: '#4af0c0', home: [ 4, 0, -1] },
  { id: 'kranz', name: 'KRANZ', color: '#ffffff', home: [ 0, 0,  3] },
]

// console desk X positions for each row (5 stations per row)
const DESK_XS = [-8, -4, 0, 4, 8]

export default function World({
  isAlert,
  onCharacterSelect,
  selectedChar,
  talkingChar,
  charPositions,
  playerPos,
  isPlayerMoving,
}) {
  const alert     = isAlert
  const accentCol = alert ? '#ff4400' : '#4488ff'
  const dimAccent = alert ? '#661100' : '#1a3a6a'
  const screenBg  = alert ? '#200800' : '#001428'

  return (
    <group>
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FLOOR                                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Main floor slab */}
      <mesh position={[0, 0.05, -0.5]} receiveShadow>
        <boxGeometry args={[25, 0.1, 18]} />
        <meshLambertMaterial color={alert ? '#100808' : '#090912'} />
      </mesh>

      {/* Floor grid lines — X axis */}
      {Array.from({ length: 26 }, (_, i) => (
        <mesh key={`gx${i}`} position={[-12 + i, 0.11, -0.5]}>
          <boxGeometry args={[0.018, 0.018, 18]} />
          <meshBasicMaterial color="#0b0f22" />
        </mesh>
      ))}
      {/* Floor grid lines — Z axis */}
      {Array.from({ length: 19 }, (_, i) => (
        <mesh key={`gz${i}`} position={[0, 0.11, -9 + i]}>
          <boxGeometry args={[25, 0.018, 0.018]} />
          <meshBasicMaterial color="#0b0f22" />
        </mesh>
      ))}

      {/* Accent floor strips */}
      <FloorStrip z={-6.0} color={accentCol}  alpha={0.9} />
      <FloorStrip z={-3.2} color={dimAccent}  alpha={1}   />
      <FloorStrip z={-0.5} color={dimAccent}  alpha={1}   />
      <FloorStrip z={ 0.5} color={accentCol}  alpha={0.6} />
      <FloorStrip z={ 4.5} color={dimAccent}  alpha={1}   />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OUTER WALLS                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <mesh position={[0,  1.8, -9.4]}><boxGeometry args={[26, 3.6, 0.4]} /><meshLambertMaterial color="#060810" /></mesh>
      <mesh position={[0,  1.8,  8.4]}><boxGeometry args={[26, 3.6, 0.4]} /><meshLambertMaterial color="#060810" /></mesh>
      <mesh position={[ 12.7, 1.8, -0.5]}><boxGeometry args={[0.4, 3.6, 18.8]} /><meshLambertMaterial color="#060810" /></mesh>
      <mesh position={[-12.7, 1.8, -0.5]}><boxGeometry args={[0.4, 3.6, 18.8]} /><meshLambertMaterial color="#060810" /></mesh>

      {/* Side wall accent panels */}
      {[-4, -1, 2, 5].map(z => (
        <WallPanel key={`L${z}`} x={-12.5} z={z} color={dimAccent} />
      ))}
      {[-4, -1, 2, 5].map(z => (
        <WallPanel key={`R${z}`} x={ 12.5} z={z} color={dimAccent} />
      ))}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BIG DISPLAY SCREEN WALL                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Backing structure */}
      <mesh position={[0, 2.0, -8.55]}>
        <boxGeometry args={[24.4, 4.0, 0.3]} />
        <meshLambertMaterial color="#03040a" />
      </mesh>

      {/* Screen bezel */}
      <mesh position={[0, 2.0, -8.4]}>
        <boxGeometry args={[23.4, 3.8, 0.08]} />
        <meshLambertMaterial color="#08090f" />
      </mesh>

      {/* Three main screen panels */}
      {[-7.6, 0, 7.6].map((x, i) => (
        <group key={`scr${i}`} position={[x, 2.0, -8.33]}>
          <mesh><boxGeometry args={[7.2, 3.3, 0.06]} /><meshBasicMaterial color={screenBg} /></mesh>
          {/* Data grid lines on screen */}
          {[...Array(4)].map((_, r) => (
            <mesh key={`sr${r}`} position={[0, -1.2 + r * 0.8, 0.04]}>
              <boxGeometry args={[7.0, 0.015, 0.01]} />
              <meshBasicMaterial color={alert ? '#331100' : '#002244'} />
            </mesh>
          ))}
          {[...Array(6)].map((_, c) => (
            <mesh key={`sc${c}`} position={[-3.0 + c * 1.2, 0, 0.04]}>
              <boxGeometry args={[0.015, 3.1, 0.01]} />
              <meshBasicMaterial color={alert ? '#331100' : '#002244'} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Screen divider strips */}
      {[-3.8, 3.8].map((x, i) => (
        <mesh key={`div${i}`} position={[x, 2.0, -8.32]}>
          <boxGeometry args={[0.12, 3.5, 0.04]} />
          <meshBasicMaterial color={accentCol} />
        </mesh>
      ))}

      {/* Screen top/bottom accent bars */}
      <mesh position={[0, 3.72, -8.35]}>
        <boxGeometry args={[23.4, 0.06, 0.05]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <mesh position={[0, 0.28, -8.35]}>
        <boxGeometry args={[23.4, 0.06, 0.05]} /><meshBasicMaterial color={accentCol} />
      </mesh>

      {/* Screen glow light */}
      <ScreenLight alert={alert} />

      {/* Ceiling valance above screen */}
      <mesh position={[0, 3.9, -7.8]}>
        <boxGeometry args={[24.4, 0.18, 1.5]} /><meshLambertMaterial color="#050710" />
      </mesh>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FRONT CONSOLE ROW  (z ≈ −5.3, engineers at z=−4)                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {DESK_XS.map(x => (
        <ConsoleDesk key={`fd${x}`} position={[x, 0, -5.3]} alert={alert} />
      ))}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BACK CONSOLE ROW  (z ≈ −2.4, engineers at z=−1)                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {DESK_XS.map(x => (
        <ConsoleDesk key={`bd${x}`} position={[x, 0, -2.4]} alert={alert} />
      ))}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* KRANZ COMMAND PLATFORM  (z = 1 to 4, elevated +0.35)                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Platform slab */}
      <mesh position={[0, 0.17, 2.5]} receiveShadow>
        <boxGeometry args={[21, 0.34, 3.4]} />
        <meshLambertMaterial color={alert ? '#150508' : '#0c1030'} />
      </mesh>

      {/* Platform front / back edge lights */}
      <mesh position={[0, 0.36, 1.0]}>
        <boxGeometry args={[21, 0.06, 0.06]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <mesh position={[0, 0.36, 4.0]}>
        <boxGeometry args={[21, 0.06, 0.06]} /><meshBasicMaterial color={accentCol} />
      </mesh>

      {/* Platform side rails */}
      <mesh position={[-10.5, 0.6, 2.5]}>
        <boxGeometry args={[0.06, 0.5, 3.4]} /><meshBasicMaterial color={accentCol} />
      </mesh>
      <mesh position={[ 10.5, 0.6, 2.5]}>
        <boxGeometry args={[0.06, 0.5, 3.4]} /><meshBasicMaterial color={accentCol} />
      </mesh>

      {/* Command desk on platform (Kranz stands at z=3, desk at z=2) */}
      <CommandDesk position={[0, 0.34, 2.1]} alert={alert} />

      {/* Platform point light */}
      <pointLight
        position={[0, 1.5, 2.5]}
        color={alert ? '#ff3300' : '#3366cc'}
        intensity={alert ? 0.5 : 0.25}
        distance={8}
      />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STRUCTURAL PILLARS                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {[-11, 11].map(x => (
        [0, -6].map(z => (
          <Pillar key={`p${x}${z}`} position={[x, 0, z]} color={dimAccent} />
        ))
      ))}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CHARACTERS                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
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

// ── Sub-components ───────────────────────────────────────────────────────────

function FloorStrip({ z, color }) {
  return (
    <mesh position={[0, 0.115, z]}>
      <boxGeometry args={[25, 0.025, 0.06]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function WallPanel({ x, z, color }) {
  const side = x < 0 ? 1 : -1
  return (
    <group position={[x, 1.0, z]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.6, 1.3, 0.08]} />
        <meshLambertMaterial color="#06080f" />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.4, 0.05, 0.12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

function Pillar({ position, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.3, 3, 0.3]} />
        <meshLambertMaterial color="#070910" />
      </mesh>
      <mesh position={[0, 3.0, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.35]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.35]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

function ScreenLight({ alert }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.intensity = (alert ? 1.2 : 0.7) + Math.sin(clock.elapsedTime * 0.4) * 0.08
    }
  })
  return (
    <pointLight
      ref={ref}
      position={[0, 1.5, -6.5]}
      color={alert ? '#ff4400' : '#4488ff'}
      distance={9}
    />
  )
}

function ConsoleDesk({ position, alert }) {
  const monColor  = alert ? '#330a00' : '#002235'
  const glowColor = alert ? '#ff3300' : '#00aaff'
  const accentCol = alert ? '#ff4400' : '#4488ff'

  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[3.5, 0.12, 0.9]} />
        <meshLambertMaterial color="#0d1535" />
      </mesh>
      {/* Front face panel */}
      <mesh position={[0, -0.28, 0.46]}>
        <boxGeometry args={[3.5, 0.56, 0.06]} />
        <meshLambertMaterial color="#08102a" />
      </mesh>
      {/* Desk legs */}
      {[-1.55, 1.55].map((x, i) => (
        <mesh key={i} position={[x, -0.35, 0]}>
          <boxGeometry args={[0.1, 0.7, 0.7]} />
          <meshLambertMaterial color="#060c1e" />
        </mesh>
      ))}
      {/* Monitors (slightly tilted back, on north face of desk) */}
      {[-1.1, 0, 1.1].map((x, i) => (
        <group key={i} position={[x, 0.42, -0.18]} rotation={[-0.3, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 0.58, 0.05]} />
            <meshBasicMaterial color={monColor} />
          </mesh>
          {/* monitor border */}
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.98, 0.66, 0.04]} />
            <meshLambertMaterial color="#04060e" />
          </mesh>
          {/* monitor glow line at top */}
          <mesh position={[0, 0.31, 0.04]}>
            <boxGeometry args={[0.82, 0.025, 0.02]} />
            <meshBasicMaterial color={glowColor} />
          </mesh>
        </group>
      ))}
      {/* Keyboard pad */}
      <mesh position={[0, 0.125, 0.22]}>
        <boxGeometry args={[2.6, 0.04, 0.32]} />
        <meshLambertMaterial color="#080f28" />
      </mesh>
      {/* Accent front-edge strip */}
      <mesh position={[0, 0.00, 0.47]}>
        <boxGeometry args={[3.5, 0.04, 0.04]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
    </group>
  )
}

function CommandDesk({ position, alert }) {
  const monColor  = alert ? '#2a0500' : '#002040'
  const glowColor = alert ? '#ff3300' : '#00aaff'
  const accentCol = alert ? '#ff4400' : '#4488ff'

  return (
    <group position={position}>
      {/* Wide curved desk surface */}
      <mesh castShadow receiveShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[6, 0.14, 1.1]} />
        <meshLambertMaterial color="#0f1a45" />
      </mesh>
      {/* Front panel */}
      <mesh position={[0, -0.32, 0.58]}>
        <boxGeometry args={[6, 0.64, 0.08]} />
        <meshLambertMaterial color="#09102e" />
      </mesh>
      {/* Desk legs */}
      {[-2.7, 0, 2.7].map((x, i) => (
        <mesh key={i} position={[x, -0.42, 0]}>
          <boxGeometry args={[0.12, 0.84, 0.8]} />
          <meshLambertMaterial color="#070c1e" />
        </mesh>
      ))}
      {/* Large center monitor */}
      <group position={[0, 0.6, -0.22]} rotation={[-0.35, 0, 0]}>
        <mesh>
          <boxGeometry args={[2.4, 0.75, 0.06]} />
          <meshBasicMaterial color={monColor} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[2.52, 0.87, 0.04]} />
          <meshLambertMaterial color="#030508" />
        </mesh>
        <mesh position={[0, 0.38, 0.05]}>
          <boxGeometry args={[2.2, 0.03, 0.02]} />
          <meshBasicMaterial color={glowColor} />
        </mesh>
      </group>
      {/* Side monitors */}
      {[-2.0, 2.0].map((x, i) => (
        <group key={i} position={[x, 0.46, -0.14]} rotation={[-0.3, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.2, 0.62, 0.05]} />
            <meshBasicMaterial color={monColor} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[1.3, 0.72, 0.04]} />
            <meshLambertMaterial color="#030508" />
          </mesh>
        </group>
      ))}
      {/* Keyboard */}
      <mesh position={[0, 0.145, 0.28]}>
        <boxGeometry args={[3.5, 0.05, 0.38]} />
        <meshLambertMaterial color="#080f30" />
      </mesh>
      {/* Accent strip front */}
      <mesh position={[0, 0.01, 0.59]}>
        <boxGeometry args={[6, 0.05, 0.05]} />
        <meshBasicMaterial color={accentCol} />
      </mesh>
      {/* Under-desk ambient light */}
      <pointLight position={[0, 0.3, 0.3]} color={accentCol} intensity={0.4} distance={4} />
    </group>
  )
}
