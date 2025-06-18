"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei"
import { CanvasTexture, BufferGeometry, Float32BufferAttribute, PointsMaterial, AdditiveBlending } from "three"

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
        <FloatingParticles />

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

function FloatingParticles() {
  const particlesRef = useRef()
  const particleCount = 150

  // Create particle positions and properties
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

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

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Assign random gradient colors
      const colorIndex = Math.floor(Math.random() * gradientColors.length)
      const color = gradientColors[colorIndex]
      colors[i * 3] = color[0]
      colors[i * 3 + 1] = color[1]
      colors[i * 3 + 2] = color[2]

      // Random sizes
      sizes[i] = Math.random() * 8 + 2
    }

    return { positions, colors, sizes }
  }, [])

  // Create geometry and material
  const particleGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
    geometry.setAttribute("size", new Float32BufferAttribute(sizes, 1))
    return geometry
  }, [positions, colors, sizes])

  const particleMaterial = useMemo(() => {
    return new PointsMaterial({
      size: 0.05,
      vertexColors: true,
      blending: AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array
      const time = state.clock.elapsedTime

      // Animate each particle
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3

        // Get original position
        const x = positions[i3]
        const y = positions[i3 + 1]
        const z = positions[i3 + 2]

        // Add floating motion
        positions[i3] = x + Math.sin(time * 0.5 + i * 0.1) * 0.02
        positions[i3 + 1] = y + Math.cos(time * 0.3 + i * 0.15) * 0.03
        positions[i3 + 2] = z + Math.sin(time * 0.4 + i * 0.2) * 0.025

        // Add orbital motion around the sphere
        const orbitSpeed = 0.1
        const orbitRadius = Math.sqrt(x * x + z * z)
        const currentAngle = Math.atan2(z, x)
        const newAngle = currentAngle + orbitSpeed * 0.01

        positions[i3] = orbitRadius * Math.cos(newAngle) + Math.sin(time * 0.5 + i * 0.1) * 0.02
        positions[i3 + 2] = orbitRadius * Math.sin(newAngle) + Math.sin(time * 0.4 + i * 0.2) * 0.025
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true

      // Rotate the entire particle system slowly
      particlesRef.current.rotation.y = time * 0.05
    }
  })

  return <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />
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
    if (meshRef.current) {
      // Position sphere and add subtle floating animation
      meshRef.current.position.y = 0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }

    // Animate the texture UV coordinates for flowing gradient effect
    if (gradientTexture) {
      // Horizontal flow - makes gradient slide across the surface
      gradientTexture.offset.x = (state.clock.elapsedTime * 0.1) % 1

      // Add subtle vertical flow for more complex movement
      gradientTexture.offset.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1

      // Slight rotation for additional movement
      gradientTexture.rotation = Math.sin(state.clock.elapsedTime * 0.2) * 0.1

      // Update the texture
      gradientTexture.needsUpdate = true
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
