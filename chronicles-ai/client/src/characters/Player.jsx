import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

const LERP     = 0.18   // position lerp — snappy but smooth
const ROT_LERP = 0.22   // facing direction lerp

export default function Player({ position, isMoving }) {
  const groupRef   = useRef()
  const bodyRef    = useRef()
  const headRef    = useRef()
  const leftLegRef = useRef()
  const rightLegRef= useRef()
  const currentPos = useRef([...position])
  const targetRotY = useRef(0)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    if (!groupRef.current) return

    // ── Smooth position lerp ────────────────────────────────────────────
    const [cx, , cz] = currentPos.current
    const [tx, , tz] = position

    const dx = tx - cx
    const dz = tz - cz
    const nx = cx + dx * LERP
    const nz = cz + dz * LERP
    currentPos.current = [nx, 0, nz]

    groupRef.current.position.x = nx
    groupRef.current.position.z = nz

    // ── Facing direction: rotate to match movement vector ───────────────
    if (Math.abs(dx) + Math.abs(dz) > 0.01) {
      targetRotY.current = Math.atan2(dx, dz)
    }

    // Shortest-path rotation lerp
    let rotDiff = targetRotY.current - groupRef.current.rotation.y
    while (rotDiff >  Math.PI) rotDiff -= 2 * Math.PI
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI
    groupRef.current.rotation.y += rotDiff * ROT_LERP

    // ── Body bob ────────────────────────────────────────────────────────
    if (bodyRef.current) {
      const dist = Math.abs(dx) + Math.abs(dz)
      const amp  = dist > 0.05 ? 0.055 : 0.025
      const spd  = dist > 0.05 ? 10 : 2
      bodyRef.current.position.y = 0.6 + Math.sin(t * spd) * amp
    }

    // ── Head idle sway ──────────────────────────────────────────────────
    if (headRef.current) {
      headRef.current.rotation.y = isMoving
        ? Math.sin(t * 7) * 0.08
        : Math.sin(t * 0.6) * 0.12
    }

    // ── Alternating leg animation (Pokémon walk cycle) ──────────────────
    if (leftLegRef.current && rightLegRef.current) {
      const dist = Math.abs(dx) + Math.abs(dz)
      const walking = dist > 0.05

      const swing = walking ? Math.sin(t * 10) * 0.28 : 0
      const liftL = walking ? Math.max(0, Math.sin(t * 10)) * 0.06 : 0
      const liftR = walking ? Math.max(0, Math.sin(t * 10 + Math.PI)) * 0.06 : 0

      leftLegRef.current.rotation.x  =  swing
      rightLegRef.current.rotation.x = -swing
      leftLegRef.current.position.y  = 0.28 + liftL
      rightLegRef.current.position.y = 0.28 + liftR
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Cyan glow ring */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.48, 24]} />
        <meshBasicMaterial color="#00ffff" opacity={0.55} transparent />
      </mesh>

      {/* Shadow */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 8]} />
        <meshBasicMaterial color="#000" opacity={0.35} transparent />
      </mesh>

      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.3, 0.4, 0.2]} />
        <meshLambertMaterial color="#00aaff" />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshLambertMaterial color="#f4c7a0" />
      </mesh>

      {/* Headset band */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.3, 0.04, 0.04]} />
        <meshLambertMaterial color="#111133" />
      </mesh>
      {/* Headset left */}
      <mesh position={[-0.14, 0.97, 0]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshLambertMaterial color="#111133" />
      </mesh>
      {/* Headset right */}
      <mesh position={[0.14, 0.97, 0]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshLambertMaterial color="#111133" />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[-0.08, 0.28, 0]} castShadow>
        <boxGeometry args={[0.1, 0.25, 0.15]} />
        <meshLambertMaterial color="#1a1a3e" />
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[0.08, 0.28, 0]} castShadow>
        <boxGeometry args={[0.1, 0.25, 0.15]} />
        <meshLambertMaterial color="#1a1a3e" />
      </mesh>

      <Text
        position={[0, 1.42, 0]}
        fontSize={0.2}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000"
      >
        YOU
      </Text>
    </group>
  )
}
