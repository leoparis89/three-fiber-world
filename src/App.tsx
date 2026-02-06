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

  useFrame(() => {
    if (rigidBodyRef.current) {
      angle.current -= 0.005
      // Rotate around local Y axis (which is world Z after the initial rotation)
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
      {/* Front face background */}
      <mesh position={[0, 0.076, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 64]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      {/* Front face image */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial map={texture} transparent />
      </mesh>
      {/* Back face - this is the FLOOR for the ball */}
      <mesh position={[0, -0.076, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 64]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      {/* Seamless metallic rim - WALLS */}
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[2, 2, 0.58, 64, 1, true]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Glass disc cover - CEILING */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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

function Ball() {
  return (
    <RigidBody
      position={[DISC_POSITION[0], DISC_POSITION[1], DISC_POSITION[2] + 0.2]}
      colliders={false}
      restitution={0.5}
      linearDamping={0.3}
    >
      <BallCollider args={[0.15]} friction={0.8} />
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#e63946" metalness={0.3} roughness={0.4} />
      </mesh>
    </RigidBody>
  )
}

function Scene() {
  return (
    <>
      <CameraRig />
      <Physics gravity={[0, -9.81, 0]}>
        <Disc />
        <Ball />
      </Physics>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3a5a40" />
      </mesh>
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
