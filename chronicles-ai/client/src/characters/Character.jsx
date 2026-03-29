import { useRef, useLayoutEffect } from 'react'
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

// Increased lerp speed so NPCs glide smoothly instead of snapping frame-to-frame
const LERP_SPEED = 0.10
const ROT_LERP   = 0.14

export default function Character({
  position,
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
  const targetRotY  = useRef(0)

  // currentPos persists the interpolated world position across frames.
  // We initialise lazily using a function so it only reads position[0/2] once.
  const currentPos = useRef(null)

  // Keep a ref to the latest target position so useFrame always has current value
  const targetPos = useRef(position)
  targetPos.current = position

  // Seed for per-character idle animation variation
  const seed = useRef(position[0] * 3.7 + position[2] * 1.3)

  useLayoutEffect(() => {
    // Initialise currentPos and the group's 3-D position on first mount
    currentPos.current = [position[0], 0, position[2]]
    if (groupRef.current) {
      groupRef.current.position.set(position[0], 0, position[2])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state) => {
    if (!groupRef.current || !currentPos.current) return
    const t    = state.clock.getElapsedTime()
    const s    = seed.current
    const [tx, , tz] = targetPos.current

    // ── Smooth glide toward target ─────────────────────────────────────
    const [cx, cy, cz] = currentPos.current
    const dx = tx - cx
    const dz = tz - cz
    const nx = cx + dx * LERP_SPEED
    const nz = cz + dz * LERP_SPEED
    currentPos.current = [nx, cy, nz]

    // Face the direction of travel
    if (Math.abs(dx) + Math.abs(dz) > 0.005) {
      targetRotY.current = Math.atan2(dx, dz)
    }
    let rotDiff = targetRotY.current - groupRef.current.rotation.y
    while (rotDiff >  Math.PI) rotDiff -= 2 * Math.PI
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI
    groupRef.current.rotation.y += rotDiff * ROT_LERP

    // Alert micro-jitter (small, overlaid on smooth position)
    const jx = isAlert ? Math.sin(t * 18 + s) * 0.02 : 0
    const jz = isAlert ? Math.cos(t * 16 + s) * 0.02 : 0

    groupRef.current.position.x = nx + jx
    groupRef.current.position.z = nz + jz

    // ── Body bob ──────────────────────────────────────────────────────
    if (bodyRef.current) {
      const speed    = isTalking ? 6 : 2
      const amp      = isTalking ? 0.08 : 0.04
      const dist     = Math.abs(dx) + Math.abs(dz)
      const walkAmp  = dist > 0.05 ? 0.05 : 0
      bodyRef.current.position.y = 0.6 + Math.sin(t * speed + s) * (amp + walkAmp)
    }

    // ── Head look ────────────────────────────────────────────────────
    if (headRef.current) {
      if (isTalking) {
        headRef.current.rotation.y = Math.sin(t * 4 + s) * 0.25
        headRef.current.rotation.x = Math.sin(t * 5 + s) * 0.1
      } else {
        headRef.current.rotation.y = Math.sin(t * 0.7 + s) * 0.4
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
