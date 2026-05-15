"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Environment, Tube } from "@react-three/drei"
import { CanvasTexture, AdditiveBlending, CatmullRomCurve3, Vector3, RepeatWrapping } from "three"
import type { Mesh, ShaderMaterial } from "three"

interface ComponentProps {
  isSpeaking?: boolean
}

// Create a global state that can be accessed by the spline
let globalSpeakingState = false

export default function Component({ isSpeaking = false }: ComponentProps) {
  // Update global state whenever prop changes
  useEffect(() => {
    console.log("🟢 InteractiveSpline isSpeaking changed to:", isSpeaking)
    globalSpeakingState = isSpeaking
  }, [isSpeaking])

  return (
    <div className="w-full h-screen" style={{ backgroundColor: "#1a1a2e" }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} shadows>
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={1.0} color="#ffffff" />
        <pointLight position={[-3, 2, 3]} intensity={0.6} color="#ff69b4" />
        <pointLight position={[3, 2, -3]} intensity={0.6} color="#00ffff" />
        <pointLight position={[0, -3, 2]} intensity={0.4} color="#ffff00" />

        {/* Simple environment for reflections */}
        <Environment background={false}>
          <mesh scale={100}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#1a1a2e" side={2} />
          </mesh>
        </Environment>

        <GradientSpline />
        <FloatingParticles />

        <ContactShadows position={[0, -2.5, 0]} opacity={0.15} scale={5} blur={2} far={2} resolution={256} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={4}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
    </div>
  )
}

function FloatingParticles() {
  const particleCount = 200

  // Create particle positions and properties
  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const gradientColors = [
      [1.0, 0.41, 0.71], // Pink
      [1.0, 0.75, 0.4],  // Orange/Peach
      [0.0, 0.75, 1.0],  // Cyan
      [0.5, 1.0, 0.5],   // Light green
      [1.0, 1.0, 0.4],   // Yellow
      [0.5, 0.5, 1.0],   // Blue
    ]

    for (let i = 0; i < particleCount; i++) {
      // Create particles in a sphere around the main spline
      const radius = 2.5 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // Assign random gradient colors
      const colorIndex = Math.floor(Math.random() * gradientColors.length)
      const color = gradientColors[colorIndex]
      colors[i * 3] = color[0]
      colors[i * 3 + 1] = color[1]
      colors[i * 3 + 2] = color[2]
    }

    return { positions, colors }
  }, [])

  // Create circular texture for round particles
  const circleTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext("2d")!

    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)")
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)

    return new CanvasTexture(canvas)
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-color" count={particleCount} array={particleData.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors={true}
        blending={AdditiveBlending}
        transparent={true}
        opacity={0.7}
        sizeAttenuation={true}
        map={circleTexture}
      />
    </points>
  )
}

// Create the intertwined looping curve path
function createSplineCurve(): CatmullRomCurve3 {
  const points: Vector3[] = []
  const segments = 500
  
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 4 // Two full rotations
    
    // Create a complex looping pattern similar to the reference image
    // This creates overlapping loops that intertwine
    const scale = 0.6
    
    // Trefoil-like knot pattern
    const x = scale * (Math.sin(t) + 2 * Math.sin(2 * t))
    const y = scale * (Math.cos(t) - 2 * Math.cos(2 * t))
    const z = scale * (-Math.sin(3 * t)) * 0.5
    
    points.push(new Vector3(x, y, z))
  }
  
  const curve = new CatmullRomCurve3(points, true) // true = closed loop
  return curve
}

function GradientSpline() {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  
  // Create the spline curve
  const curve = useMemo(() => createSplineCurve(), [])
  
  // Create animated gradient texture
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 1024
    canvas.height = 64
    const context = canvas.getContext("2d")!

    // Create rainbow gradient matching the reference images
    const gradient = context.createLinearGradient(0, 0, 1024, 0)
    gradient.addColorStop(0, "#FF69B4")    // Pink
    gradient.addColorStop(0.1, "#FFB366")  // Orange/Peach
    gradient.addColorStop(0.25, "#0066FF") // Blue
    gradient.addColorStop(0.4, "#00FFFF")  // Cyan
    gradient.addColorStop(0.55, "#00FF88") // Green
    gradient.addColorStop(0.7, "#FFFF00")  // Yellow
    gradient.addColorStop(0.85, "#FF69B4") // Pink (repeat)
    gradient.addColorStop(1, "#FFB366")    // Orange (back to start blend)

    context.fillStyle = gradient
    context.fillRect(0, 0, 1024, 64)

    const texture = new CanvasTexture(canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(1, 1) // Single smooth gradient along the tube
    return texture
  }, [])

  useFrame((state) => {
    const isSpeaking = globalSpeakingState

    if (meshRef.current) {
      // Gentle floating animation only - no rotation
      const baseY = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
      meshRef.current.position.y = baseY
    }

    // Animate the texture flowing along the spline
    if (gradientTexture) {
      // Speed of flow animation - faster when speaking
      const speed = isSpeaking ? 0.3 : 0.1
      gradientTexture.offset.x = (state.clock.elapsedTime * speed) % 1
      gradientTexture.needsUpdate = true
    }
  })

  return (
    <group ref={meshRef}>
      <Tube args={[curve, 300, 0.25, 32, true]}>
        <meshPhysicalMaterial
          map={gradientTexture}
          color="#ffffff"
          transparent={true}
          opacity={0.95}
          roughness={0.15}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          envMapIntensity={0.8}
          emissive="#ffffff"
          emissiveIntensity={0.15}
          emissiveMap={gradientTexture}
        />
      </Tube>
    </group>
  )
}
