import { useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

const LERP     = 0.12   // glide speed — lower = more floaty, higher = snappier
const ROT_LERP = 0.18

export default function Player({ position, isMoving }) {
  const groupRef    = useRef()
  const bodyRef     = useRef()
  const headRef     = useRef()
  const leftLegRef  = useRef()
  const rightLegRef = useRef()
  const currentPos  = useRef([...position])
  const targetRotY  = useRef(0)

  // Set initial 3D position once on mount so the character doesn't flash at origin.
  // After this, useFrame owns group.position entirely — no reactive JSX prop.
  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], 0, position[2])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!groupRef.current) return

    // ── Glide toward logical grid target ────────────────────────────────
    const [cx, , cz] = currentPos.current
    const [tx, , tz] = position

    const dx = tx - cx
    const dz = tz - cz
    const nx = cx + dx * LERP
    const nz = cz + dz * LERP
    currentPos.current = [nx, 0, nz]

    // Write position — NOT via JSX prop so React/R3F won't snap it
    groupRef.current.position.x = nx
    groupRef.current.position.z = nz

    // ── Facing direction ────────────────────────────────────────────────
    if (Math.abs(dx) + Math.abs(dz) > 0.008) {
      targetRotY.current = Math.atan2(dx, dz)
    }
    let rotDiff = targetRotY.current - groupRef.current.rotation.y
    while (rotDiff >  Math.PI) rotDiff -= 2 * Math.PI
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI
    groupRef.current.rotation.y += rotDiff * ROT_LERP

    // ── Body bob ────────────────────────────────────────────────────────
    if (bodyRef.current) {
      const moving = Math.abs(dx) + Math.abs(dz) > 0.02
      bodyRef.current.position.y = 0.6 + Math.sin(t * (moving ? 10 : 2)) * (moving ? 0.05 : 0.02)
    }

    // ── Head idle ───────────────────────────────────────────────────────
    if (headRef.current) {
      headRef.current.rotation.y = isMoving
        ? Math.sin(t * 7) * 0.07
        : Math.sin(t * 0.6) * 0.10
    }

    // ── Alternating leg swing ────────────────────────────────────────────
    if (leftLegRef.current && rightLegRef.current) {
      const moving = Math.abs(dx) + Math.abs(dz) > 0.02
      const swing  = moving ? Math.sin(t * 10) * 0.3 : 0
      leftLegRef.current.rotation.x   =  swing
      rightLegRef.current.rotation.x  = -swing
      leftLegRef.current.position.y   = 0.28 + (moving ? Math.max(0, Math.sin(t * 10)) * 0.05 : 0)
      rightLegRef.current.position.y  = 0.28 + (moving ? Math.max(0, Math.sin(t * 10 + Math.PI)) * 0.05 : 0)
    }
  })

  return (
    // No position prop — useFrame drives it exclusively to avoid R3F snapping
    <group ref={groupRef}>
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
      <mesh position={[-0.14, 0.97, 0]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshLambertMaterial color="#111133" />
      </mesh>
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
