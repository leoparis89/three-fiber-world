import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture, Sky } from '@react-three/drei'
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import './App.css'

const DISC_POSITION: [number, number, number] = [0, 2, -8]
const ORBIT_RADIUS = 10

function CameraRig() {
  const { camera, gl } = useThree()
  const angleH = useRef(0) // horizontal orbit angle
  const angleV = useRef(0.2) // vertical orbit angle
  const distance = useRef(ORBIT_RADIUS)
  const keys = useRef({ left: false, right: false, up: false, down: false })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Arrow keys for movement
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

    // Mouse drag for rotation
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - lastMouse.current.x
        const deltaY = e.clientY - lastMouse.current.y
        angleH.current -= deltaX * 0.005
        angleV.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, angleV.current + deltaY * 0.005))
        lastMouse.current = { x: e.clientX, y: e.clientY }
      }
    }
    const handleMouseUp = () => {
      isDragging.current = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    gl.domElement.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      gl.domElement.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [gl])

  const offset = useRef({ x: 0, z: 0 })

  useFrame(() => {
    // Calculate movement direction based on camera angle
    const moveSpeed = 0.15
    if (keys.current.up) {
      offset.current.x -= Math.sin(angleH.current) * moveSpeed
      offset.current.z -= Math.cos(angleH.current) * moveSpeed
    }
    if (keys.current.down) {
      offset.current.x += Math.sin(angleH.current) * moveSpeed
      offset.current.z += Math.cos(angleH.current) * moveSpeed
    }
    if (keys.current.left) {
      offset.current.x -= Math.cos(angleH.current) * moveSpeed
      offset.current.z += Math.sin(angleH.current) * moveSpeed
    }
    if (keys.current.right) {
      offset.current.x += Math.cos(angleH.current) * moveSpeed
      offset.current.z -= Math.sin(angleH.current) * moveSpeed
    }

    const targetX = DISC_POSITION[0] + offset.current.x
    const targetZ = DISC_POSITION[2] + offset.current.z

    const x = targetX + Math.sin(angleH.current) * Math.cos(angleV.current) * distance.current
    const y = DISC_POSITION[1] + Math.sin(angleV.current) * distance.current
    const z = targetZ + Math.cos(angleH.current) * Math.cos(angleV.current) * distance.current
    camera.position.set(x, y, z)
    camera.lookAt(targetX, DISC_POSITION[1], targetZ)
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
      <Sky sunPosition={[100, 2, 100]} turbidity={10} rayleigh={0.5} />
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
