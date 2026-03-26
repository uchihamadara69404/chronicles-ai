import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

const ROLES = {
  'KRANZ':  { title: 'Flight Director',        color: '#ffffff', bio: 'Gene Kranz. In charge of everything. His word is final.' },
  'ENG-1':  { title: 'FIDO — Flight Dynamics',  color: '#4af0c0', bio: 'Tracks spacecraft trajectory and orbital mechanics.' },
  'ENG-2':  { title: 'GUIDO — Guidance',        color: '#4af0c0', bio: 'Monitors onboard guidance computer systems.' },
  'ENG-3':  { title: 'TELMU — Electrical',      color: '#4af0c0', bio: 'Monitors power and life support systems.' },
  'ENG-4':  { title: 'RETRO — Retrofire',       color: '#4a8ff0', bio: 'Calculates re-entry burn procedures.' },
  'ENG-5':  { title: 'SURGEON — Flight Surgeon', color: '#4a8ff0', bio: 'Monitors crew health and vital signs.' },
}

const LERP_SPEED = 0.04  // smooth walk feel — adjust 0.02 (slow) to 0.08 (brisk)

export default function Character({
  position,       // [x, y, z] — static home/crisis target from World
  color,
  name,
  onSelect,
  isSelected,
  isAlert,
  isTalking,
}) {
  const bodyRef     = useRef()
  const headRef     = useRef()
  const groupRef    = useRef()
  const glowRingRef = useRef()

  // Current interpolated position (starts at target)
  const currentPos = useRef([...position])

  useFrame((state) => {
    const t    = state.clock.getElapsedTime()
    const seed = position[0] * 3.7 + position[2] * 1.3

    // ── Smooth movement (lerp toward target) ──────────────────────────
    if (groupRef.current) {
      const [cx, cy, cz] = currentPos.current
      const [tx, , tz]   = position

      const nx = cx + (tx - cx) * LERP_SPEED
      const nz = cz + (tz - cz) * LERP_SPEED
      currentPos.current = [nx, cy, nz]

      // Alert micro-jitter overlaid on top of smooth position
      const jx = isAlert ? Math.sin(t * 18 + seed) * 0.03 : 0
      const jz = isAlert ? Math.cos(t * 16 + seed) * 0.03 : 0

      groupRef.current.position.x = nx + jx
      groupRef.current.position.z = nz + jz
    }

    // ── Body bob ──────────────────────────────────────────────────────
    if (bodyRef.current) {
      const speed = isTalking ? 6 : 2
      const amp   = isTalking ? 0.08 : 0.04
      // Extra bob when moving (distance to target > threshold)
      const dist  = Math.abs(position[0] - currentPos.current[0]) + Math.abs(position[2] - currentPos.current[2])
      const walkAmp = dist > 0.1 ? 0.06 : 0
      bodyRef.current.position.y = 0.6 + Math.sin(t * speed + seed) * (amp + walkAmp)
    }

    // ── Head look ────────────────────────────────────────────────────
    if (headRef.current) {
      if (isTalking) {
        headRef.current.rotation.y = Math.sin(t * 4 + seed) * 0.25
        headRef.current.rotation.x = Math.sin(t * 5 + seed) * 0.1
      } else {
        headRef.current.rotation.y = Math.sin(t * 0.7 + seed) * 0.4
        headRef.current.rotation.x = 0
      }
    }

    // ── Talking glow ring ────────────────────────────────────────────
    if (glowRingRef.current) {
      glowRingRef.current.material.opacity = isTalking
        ? 0.4 + Math.sin(t * 8) * 0.4
        : 0
    }
  })

  const role      = ROLES[name] || {}
  const glowColor = isTalking ? '#ffff00' : (isSelected ? '#ffff00' : (isAlert ? '#ff4400' : color))

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect({ name, ...role }) }}
    >
      {/* Click hitbox */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.6, 1.4, 0.6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Shadow */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 8]} />
        <meshBasicMaterial color="#000000" opacity={0.3} transparent />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.38, 16]} />
          <meshBasicMaterial color="#ffff00" opacity={0.9} transparent />
        </mesh>
      )}

      {/* Talking glow ring */}
      <mesh ref={glowRingRef} position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.52, 24]} />
        <meshBasicMaterial color="#ffff00" opacity={0} transparent />
      </mesh>

      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.3, 0.4, 0.2]} />
        <meshLambertMaterial color={glowColor} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshLambertMaterial color="#f4c7a0" />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.08, 0.28, 0]} castShadow>
        <boxGeometry args={[0.1, 0.25, 0.15]} />
        <meshLambertMaterial color="#1a1a3e" />
      </mesh>
      <mesh position={[0.08, 0.28, 0]} castShadow>
        <boxGeometry args={[0.1, 0.25, 0.15]} />
        <meshLambertMaterial color="#1a1a3e" />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, 1.35, 0]}
        fontSize={0.18}
        color={isTalking ? '#ffff00' : (isSelected ? '#ffff00' : '#ffffff')}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>

      {/* Talking indicator orb */}
      {isTalking && (
        <mesh position={[0.22, 1.1, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      )}
    </group>
  )
}
