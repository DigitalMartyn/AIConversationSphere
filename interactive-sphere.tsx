"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei"
import { CanvasTexture, AdditiveBlending } from "three"

interface ComponentProps {
  isSpeaking?: boolean
}

// Create a global state that can be accessed by the sphere
let globalSpeakingState = false

export default function Component({ isSpeaking = false }: ComponentProps) {
  // Update global state whenever prop changes
  useEffect(() => {
    console.log("🟢 InteractiveSphere isSpeaking changed to:", isSpeaking)
    globalSpeakingState = isSpeaking
  }, [isSpeaking])

  return (
    <div className="w-full h-screen" style={{ backgroundColor: "#c4b5fd" }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} shadows>
        <ambientLight intensity={0.6} color="#f5f0ff" />
        <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-3, 2, 3]} intensity={0.5} color="#ff69b4" />
        <pointLight position={[3, 2, -3]} intensity={0.5} color="#87ceeb" />

        {/* Simple environment for reflections */}
        <Environment background={false}>
          <mesh scale={100}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#c4b5fd" side={2} />
          </mesh>
        </Environment>

        <GradientSphere />
        <FloatingParticles />

        <ContactShadows position={[0, -2.5, 0]} opacity={0.15} scale={3} blur={1.5} far={1.5} resolution={256} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={8}
          autoRotate={true}
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  )
}

function FloatingParticles() {
  const particleCount = 150

  // Create particle positions and properties
  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const gradientColors = [
      [1.0, 0.08, 0.58], // Deep pink
      [0.6, 0.2, 0.8], // Dark orchid
      [0.12, 0.56, 1.0], // Dodger blue
      [1.0, 1.0, 1.0], // White
    ]

    for (let i = 0; i < particleCount; i++) {
      // Create particles in a sphere around the main sphere
      const radius = 2 + Math.random() * 3 // Distance from center
      const theta = Math.random() * Math.PI * 2 // Horizontal angle
      const phi = Math.random() * Math.PI // Vertical angle

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
    const context = canvas.getContext("2d")

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
        size={0.05}
        vertexColors={true}
        blending={AdditiveBlending}
        transparent={true}
        opacity={0.8}
        sizeAttenuation={true}
        map={circleTexture}
      />
    </points>
  )
}

function GradientSphere() {
  const meshRef = useRef()

  // Create a simple horizontal gradient texture
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext("2d")

    // Create seamless wrapping gradient
    const gradient = context.createLinearGradient(0, 0, 512, 0)
    gradient.addColorStop(0, "#FF1493") // Deep pink
    gradient.addColorStop(0.25, "#9932CC") // Dark orchid
    gradient.addColorStop(0.5, "#1E90FF") // Dodger blue
    gradient.addColorStop(0.75, "#9932CC") // Dark orchid (mirror)
    gradient.addColorStop(1, "#FF1493") // Deep pink (back to start)

    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)

    // Enable texture wrapping for seamless animation
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = 1000 // RepeatWrapping
    return texture
  }, [])

  useFrame((state) => {
    // Access the global speaking state directly
    const isSpeaking = globalSpeakingState

    if (meshRef.current) {
      // Base floating animation
      const baseY = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      meshRef.current.position.y = baseY

      // Base scale and animation parameters
      const baseScale = 1.5

      if (isSpeaking) {
        // Dramatic pulsing when AI is speaking
        const pulseAmount = Math.sin(state.clock.elapsedTime * 5) * 0.1
        const pulseScale = baseScale + pulseAmount

        // Log every few seconds to confirm pulsing
        if (Math.floor(state.clock.elapsedTime) % 2 === 0 && state.clock.elapsedTime % 1 < 0.1) {
          console.log("🔵 Sphere is pulsing! Scale:", pulseScale.toFixed(2))
        }

        meshRef.current.scale.setScalar(pulseScale)

        // Add rotation when speaking
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.8
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
      } else {
        // Subtle breathing animation when not speaking
        const breatheAmount = Math.sin(state.clock.elapsedTime * 0.8) * 0.03
        const breatheScale = baseScale + breatheAmount
        meshRef.current.scale.setScalar(breatheScale)

        // Slow rotation when not speaking
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.1
        meshRef.current.rotation.x = 0
      }
    }

    // Animate the texture UV coordinates for flowing gradient effect
    if (gradientTexture) {
      // Speed up texture animation when speaking
      const speed = isSpeaking ? 0.4 : 0.1
      gradientTexture.offset.x = (state.clock.elapsedTime * speed) % 1

      // Add more dramatic vertical flow when speaking
      const verticalIntensity = isSpeaking ? 0.2 : 0.05
      gradientTexture.offset.y = Math.sin(state.clock.elapsedTime * 0.3) * verticalIntensity

      // More rotation when speaking
      const rotationIntensity = isSpeaking ? 0.2 : 0.05
      gradientTexture.rotation = Math.sin(state.clock.elapsedTime * 0.2) * rotationIntensity

      gradientTexture.needsUpdate = true
    }
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[1, 128, 128]} />
      <meshPhysicalMaterial
        map={gradientTexture}
        color="#ffffff"
        transparent={true}
        opacity={0.85}
        transmission={0.4}
        thickness={0.2}
        ior={1.2}
        roughness={0.05}
        metalness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.05}
        envMapIntensity={1.0}
        // More dramatic emissive when speaking
        emissive="#ffffff"
        emissiveIntensity={globalSpeakingState ? 0.8 : 0.2}
        emissiveMap={gradientTexture}
        sheen={1.0}
        sheenRoughness={0.1}
        sheenColor="#ffffff"
      />
    </mesh>
  )
}
