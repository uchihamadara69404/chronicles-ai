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

// Static character definitions — position is the HOME position
// charPositions prop overrides with current target per character
const CHARACTER_DEFS = [
  { id: 'kranz',     name: 'KRANZ',  color: '#ffffff', home: [0,  0,  2]  },
  { id: 'engineer1', name: 'ENG-1',  color: '#4af0c0', home: [-4, 0, -1]  },
  { id: 'engineer2', name: 'ENG-2',  color: '#4af0c0', home: [0,  0, -1]  },
  { id: 'engineer3', name: 'ENG-3',  color: '#4af0c0', home: [4,  0, -1]  },
  { id: 'engineer4', name: 'ENG-4',  color: '#4a8ff0', home: [-4, 0, -4]  },
  { id: 'engineer5', name: 'ENG-5',  color: '#4a8ff0', home: [4,  0, -4]  },
]

export default function World({
  isAlert,
  onCharacterSelect,
  selectedChar,
  talkingChar,
  charPositions,   // { [charKey]: [x, y, z] } — from App.jsx
}) {
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
      {CHARACTER_DEFS.map(c => {
        // Use dynamic position if provided, else home position
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
    </group>
  )
}
