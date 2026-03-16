import { useState } from 'react'
import Tile from './Tile'
import Character from '../characters/Character'

const MAP = [
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 2],
  [2, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 2],
  [2, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2],
  [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2],
  [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2],
  [2, 0, 0, 2, 2, 2, 3, 2, 3, 2, 2, 2, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
]

const TILE_COLORS = {
  0: '#1a1a2e',
  1: '#16213e',
  2: '#0f3460',
  3: '#e94560',
}

const TILE_HEIGHTS = {
  0: 0.1,
  1: 0.4,
  2: 0.8,
  3: 0.2,
}

const CHARACTERS = [
  { id: 'kranz',     position: [0, 0, 2],   color: '#ffffff', name: 'KRANZ'  },
  { id: 'engineer1', position: [-4, 0, -1], color: '#4af0c0', name: 'ENG-1'  },
  { id: 'engineer2', position: [0, 0, -1],  color: '#4af0c0', name: 'ENG-2'  },
  { id: 'engineer3', position: [4, 0, -1],  color: '#4af0c0', name: 'ENG-3'  },
  { id: 'engineer4', position: [-4, 0, -4], color: '#4a8ff0', name: 'ENG-4'  },
  { id: 'engineer5', position: [4, 0, -4],  color: '#4a8ff0', name: 'ENG-5'  },
]

export default function World({ isAlert, onCharacterSelect, selectedChar }) {
  const offsetX = -(MAP[0].length / 2)
  const offsetZ = -(MAP.length / 2)

  return (
    <group>
      {MAP.map((row, z) =>
        row.map((type, x) => (
          <Tile
            key={`${x}-${z}`}
            position={[x + offsetX, 0, z + offsetZ]}
            color={isAlert && type === 0 ? '#1a0a0a' : TILE_COLORS[type]}
            height={TILE_HEIGHTS[type]}
          />
        ))
      )}
      {CHARACTERS.map(c => (
        <Character
          key={c.id}
          position={c.position}
          color={c.color}
          name={c.name}
          onSelect={onCharacterSelect}
          isSelected={selectedChar?.name === c.name}
          isAlert={isAlert}
        />
      ))}
    </group>
  )
}
