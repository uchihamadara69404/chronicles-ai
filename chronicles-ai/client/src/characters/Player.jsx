import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

const LERP = 0.14

export default function Player({ position, isMoving }) {
  const groupRef  = useRef()
  const bodyRef   = useRef()
  const headRef   = useRef()
  const currentPos = useRef([...position])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    if (groupRef.current) {
      const [cx, , cz] = currentPos.current
      const [tx, , tz] = position
      const nx = cx + (tx - cx) * LERP
      const nz = cz + (tz - cz) * LERP
      currentPos.current = [nx, 0, nz]
      groupRef.current.position.x = nx
      groupRef.current.position.z = nz
    }

    if (bodyRef.current) {
      const dist = Math.abs(position[0] - currentPos.current[0]) + Math.abs(position[2] - currentPos.current[2])
      const amp = dist > 0.15 ? 0.07 : 0.03
      bodyRef.current.position.y = 0.6 + Math.sin(t * (isMoving ? 9 : 2)) * amp
    }

    if (headRef.current) {
      headRef.current.rotation.y = isMoving
        ? Math.sin(t * 7) * 0.12
        : Math.sin(t * 0.6) * 0.15
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

      {/* Legs */}
      <mesh position={[-0.08, 0.28, 0]} castShadow>
        <boxGeometry args={[0.1, 0.25, 0.15]} />
        <meshLambertMaterial color="#1a1a3e" />
      </mesh>
      <mesh position={[0.08, 0.28, 0]} castShadow>
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
