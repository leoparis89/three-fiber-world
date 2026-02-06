import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import './App.css'

const DISC_POSITION: [number, number, number] = [0, 2, -8]
const ORBIT_RADIUS = 10

function CameraRig() {
  const { camera } = useThree()
  const angleH = useRef(0) // horizontal angle
  const angleV = useRef(0) // vertical angle
  const keys = useRef({ left: false, right: false, up: false, down: false })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = true
      if (e.key === 'ArrowRight') keys.current.right = true
      if (e.key === 'ArrowUp') keys.current.up = true
      if (e.key === 'ArrowDown') keys.current.down = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = false
      if (e.key === 'ArrowRight') keys.current.right = false
      if (e.key === 'ArrowUp') keys.current.up = false
      if (e.key === 'ArrowDown') keys.current.down = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(() => {
    if (keys.current.left) angleH.current += 0.02
    if (keys.current.right) angleH.current -= 0.02
    if (keys.current.up) angleV.current = Math.min(angleV.current + 0.02, Math.PI / 2 - 0.1)
    if (keys.current.down) angleV.current = Math.max(angleV.current - 0.02, -Math.PI / 2 + 0.1)

    const x = DISC_POSITION[0] + Math.sin(angleH.current) * Math.cos(angleV.current) * ORBIT_RADIUS
    const y = DISC_POSITION[1] + Math.sin(angleV.current) * ORBIT_RADIUS
    const z = DISC_POSITION[2] + Math.cos(angleH.current) * Math.cos(angleV.current) * ORBIT_RADIUS
    camera.position.set(x, y, z)
    camera.lookAt(DISC_POSITION[0], DISC_POSITION[1], DISC_POSITION[2])
  })

  return null
}

function Disc() {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const texture = useTexture('/Felix_The_Cat.webp')
  texture.colorSpace = THREE.SRGBColorSpace
  const angle = useRef(0)
  const velocity = useRef(-0.005) // auto-spin speed
  const isDragging = useRef(false)
  const lastX = useRef(0)

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - lastX.current
        velocity.current = deltaX * 0.002 // Convert drag to rotation
        lastX.current = e.clientX
      }
    }
    const handlePointerUp = () => {
      isDragging.current = false
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const handlePointerDown = (e: { stopPropagation: () => void; clientX: number }) => {
    e.stopPropagation()
    isDragging.current = true
    lastX.current = e.clientX
  }

  useFrame(() => {
    if (rigidBodyRef.current) {
      // Apply velocity with friction (slows down over time when not dragging)
      if (!isDragging.current) {
        // Gradually return to auto-spin, with friction
        velocity.current = velocity.current * 0.98 + (-0.005) * 0.02
      }
      angle.current += velocity.current
      
      const q = new THREE.Quaternion()
      q.setFromEuler(new THREE.Euler(Math.PI / 2, angle.current, 0))
      rigidBodyRef.current.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    }
  })

  // colliders="trimesh" is the magic — it auto-generates collision geometry
  // from ALL child meshes. So back face = floor, rim = walls, glass = ceiling.
  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      position={DISC_POSITION}
      rotation={[Math.PI / 2, 0, 0]}
      colliders="trimesh"
    >
      {/* Front face background - clickable for drag */}
      <mesh position={[0, 0.076, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={handlePointerDown}>
        <circleGeometry args={[2, 64]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      {/* Front face image */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={handlePointerDown}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial map={texture} transparent />
      </mesh>
      {/* Back face - this is the FLOOR for the ball */}
      <mesh position={[0, -0.076, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 64]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      {/* Seamless metallic rim - WALLS */}
      {/* Rim - flat ring with 0.1 thickness */}
      {/* Outer wall */}
      <mesh position={[0, 0.21, 0]} onPointerDown={handlePointerDown}>
        <cylinderGeometry args={[2.1, 2.1, 0.58, 64, 1, true]} />
        <meshStandardMaterial color="pink" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Inner wall */}
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.58, 64, 1, true]} />
        <meshStandardMaterial color="pink" metalness={0.8} roughness={0.2} side={THREE.BackSide} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.1, 64]} />
        <meshStandardMaterial color="pink" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Bottom cap */}
      <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.1, 64]} />
        <meshStandardMaterial color="pink" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Glass disc cover - CEILING - also clickable */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={handlePointerDown}>
        <circleGeometry args={[2, 64]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.1}
          roughness={0}
          metalness={0}
          transmission={1}
          thickness={0.05}
          color="#ffffff"
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </RigidBody>
  )
}

const BALL_COLORS = [
  '#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653',
  '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#fee440'
]

function Balls() {
  return (
    <>
      {BALL_COLORS.map((color, i) => {
        const angle = (i / BALL_COLORS.length) * Math.PI * 2
        const r = 0.5 + (i % 3) * 0.3
        return (
          <RigidBody
            key={i}
            position={[
              DISC_POSITION[0] + Math.cos(angle) * r,
              DISC_POSITION[1] + Math.sin(angle) * r,
              DISC_POSITION[2] + 0.2
            ]}
            colliders={false}
            restitution={0.5}
            linearDamping={0.3}
          >
            <BallCollider args={[0.12]} friction={0.8} />
            <mesh>
              <sphereGeometry args={[0.12, 32, 32]} />
              <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
            </mesh>
          </RigidBody>
        )
      })}
    </>
  )
}

function Floor() {
  const texture = useTexture('https://threejs.org/examples/textures/terrain/grasslight-big.jpg')
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(50, 50)
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <CameraRig />
      <Physics gravity={[0, -9.81, 0]}>
        <Disc />
        <Balls />
      </Physics>
      <Floor />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="white" />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#ffeedd" />
      <pointLight position={[0, -3, 0]} intensity={0.3} color="#aaccff" />
    </>
  )
}

export default function App() {
  return (
    <div id="canvas-container">
      <Canvas>
        <Scene />
      </Canvas>
    </div>
  )
}
