"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei"
import { CanvasTexture } from "three"

export default function Component() {
  return (
    <div className="w-full h-screen" style={{ backgroundColor: "#c4b5fd" }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} shadows>
        <ambientLight intensity={0.6} color="#f5f0ff" />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          color="#ffffff"
        />
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

        <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={8} blur={2.5} far={2.5} />

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

function GradientSphere() {
  const meshRef = useRef()
  const displacementCanvasRef = useRef()

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

    return new CanvasTexture(canvas)
  }, [])

  // Create animated displacement map for ripples
  const displacementTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    displacementCanvasRef.current = canvas
    return new CanvasTexture(canvas)
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      // Position sphere and add subtle floating animation
      meshRef.current.position.y = 0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }

    // Update displacement map for animated ripples
    if (displacementCanvasRef.current) {
      const canvas = displacementCanvasRef.current
      const context = canvas.getContext("2d")
      const time = state.clock.elapsedTime

      // Clear canvas
      context.fillStyle = "#808080" // Neutral gray (no displacement)
      context.fillRect(0, 0, 256, 256)

      // Create multiple wave patterns
      const imageData = context.getImageData(0, 0, 256, 256)
      const data = imageData.data

      for (let x = 0; x < 256; x++) {
        for (let y = 0; y < 256; y++) {
          const index = (y * 256 + x) * 4

          // Convert to spherical-like coordinates for better wave distribution
          const centerX = x - 128
          const centerY = y - 128
          const distance = Math.sqrt(centerX * centerX + centerY * centerY) / 128
          const angle = Math.atan2(centerY, centerX)

          // Create multiple wave patterns
          const wave1 = Math.sin(distance * 8 + time * 2) * 0.3
          const wave2 = Math.sin(angle * 4 + time * 1.5) * 0.2
          const wave3 = Math.sin(x * 0.05 + time * 3) * Math.sin(y * 0.05 + time * 2.5) * 0.2

          // Combine waves and convert to displacement value (0-255)
          const displacement = (wave1 + wave2 + wave3) * 0.5 + 0.5
          const value = Math.floor(displacement * 255)

          // Set RGB to same value for grayscale displacement
          data[index] = value // R
          data[index + 1] = value // G
          data[index + 2] = value // B
          data[index + 3] = 255 // A
        }
      }

      context.putImageData(imageData, 0, 0)
      displacementTexture.needsUpdate = true
    }
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[1.125, 128, 128]} />
      <meshPhysicalMaterial
        map={gradientTexture}
        color="#ffffff"
        transparent={true}
        opacity={0.85}
        // Displacement map for ripples
        displacementMap={displacementTexture}
        displacementScale={0.02} // Very subtle displacement
        // Subsurface scattering and transmission - adjusted for white edges
        transmission={0.4}
        thickness={0.2}
        ior={1.2}
        // Surface properties for reflections
        roughness={0.05}
        metalness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.05}
        // Environment reflections
        envMapIntensity={1.0}
        // Boost colors with emissive - enhanced for white edges
        emissive="#ffffff"
        emissiveIntensity={0.2}
        emissiveMap={gradientTexture}
        // Add sheen for additional white edge effect
        sheen={1.0}
        sheenRoughness={0.1}
        sheenColor="#ffffff"
      />
    </mesh>
  )
}
