import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import './App.css'

const DISC_POSITION: [number, number, number] = [0, 2, -8]
const ORBIT_RADIUS = 10

function CameraRig() {
  const { camera } = useThree()
  const angle = useRef(0)
  const keys = useRef({ left: false, right: false })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = true
      if (e.key === 'ArrowRight') keys.current.right = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = false
      if (e.key === 'ArrowRight') keys.current.right = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(() => {
    if (keys.current.left) angle.current += 0.02
    if (keys.current.right) angle.current -= 0.02

    const x = DISC_POSITION[0] + Math.sin(angle.current) * ORBIT_RADIUS
    const z = DISC_POSITION[2] + Math.cos(angle.current) * ORBIT_RADIUS
    camera.position.set(x, DISC_POSITION[1], z)
    camera.lookAt(DISC_POSITION[0], DISC_POSITION[1], DISC_POSITION[2])
  })

  return null
}

function Disc() {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useTexture('/Felix_The_Cat.webp')
  texture.colorSpace = THREE.SRGBColorSpace

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= 0.005
    }
  })

  return (
    <group ref={groupRef} position={DISC_POSITION} rotation={[Math.PI / 2, 0, 0]}>
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
      {/* Back face */}
      <mesh position={[0, -0.076, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 64]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      {/* Seamless metallic rim from back to glass cover */}
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[2, 2, 0.58, 64, 1, true]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Glass disc cover */}
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
    </group>
  )
}

function Scene() {
  return (
    <>
      <CameraRig />
      <Disc />
      <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed" position={[0, -3, 0]} friction={0.5}>
          <CuboidCollider args={[100, 0.1, 100]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#3a5a40" />
          </mesh>
        </RigidBody>
      </Physics>
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
