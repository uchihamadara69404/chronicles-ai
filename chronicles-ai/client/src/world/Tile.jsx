export default function Tile({ position, color, height }) {
  return (
    <mesh position={[position[0], height / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={[0.95, height, 0.95]} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}
