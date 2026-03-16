import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

const ROLES = {
  'KRANZ':  { title: 'Flight Director',     color: '#ffffff', bio: 'Gene Kranz. In charge of everything. His word is final.' },
  'ENG-1':  { title: 'FIDO — Flight Dynamics', color: '#4af0c0', bio: 'Tracks spacecraft trajectory and orbital mechanics.' },
  'ENG-2':  { title: 'GUIDO — Guidance',    color: '#4af0c0', bio: 'Monitors onboard guidance computer systems.' },
  'ENG-3':  { title: 'TELMU — Electrical',  color: '#4af0c0', bio: 'Monitors power and life support systems.' },
  'ENG-4':  { title: 'RETRO — Retrofire',   color: '#4a8ff0', bio: 'Calculates re-entry burn procedures.' },
  'ENG-5':  { title: 'SURGEON — Flight Surgeon', color: '#4a8ff0', bio: 'Monitors crew health and vital signs.' },
}

export default function Character({ position, color, name, onSelect, isSelected, isAlert }) {
  const bodyRef = useRef()
  const headRef = useRef()
  const groupRef = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const seed = position[0] * 3.7 + position[2] * 1.3

    // Body bob
    if (bodyRef.current) {
      bodyRef.current.position.y = 0.6 + Math.sin(t * 2 + seed) * 0.04
    }

    // Head look-around
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.7 + seed) * 0.4
    }

    // Alert: nervous jitter
    if (isAlert && groupRef.current) {
      groupRef.current.position.x = position[0] + Math.sin(t * 18 + seed) * 0.03
      groupRef.current.position.z = position[2] + Math.cos(t * 16 + seed) * 0.03
    } else if (groupRef.current) {
      groupRef.current.position.x = position[0]
      groupRef.current.position.z = position[2]
    }
  })

  const role = ROLES[name] || {}
  const glowColor = isSelected ? '#ffff00' : (isAlert ? '#ff4400' : color)

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onSelect({ name, ...role }) }}>
      {/* Click hitbox — invisible but large */}
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
        color={isSelected ? '#ffff00' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  )
}
