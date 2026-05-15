"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows } from "@react-three/drei"
import { 
  CanvasTexture, 
  AdditiveBlending, 
  CatmullRomCurve3, 
  Vector3, 
  TubeGeometry,
  Color,
  BufferAttribute
} from "three"
import type { Mesh } from "three"

interface ComponentProps {
  isSpeaking?: boolean
}

// Create a global state that can be accessed by the spline
let globalSpeakingState = false

export default function Component({ isSpeaking = false }: ComponentProps) {
  useEffect(() => {
    globalSpeakingState = isSpeaking
  }, [isSpeaking])

  return (
    <div className="w-full h-screen" style={{ backgroundColor: "#1a1a2e" }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} shadows>
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.6} color="#ffffff" />
        <pointLight position={[-3, 2, 3]} intensity={0.3} color="#ff69b4" />
        <pointLight position={[3, 2, -3]} intensity={0.3} color="#00ffff" />

        <GradientSpline />
        <FloatingParticles />

        <ContactShadows position={[0, -2, 0]} opacity={0.1} scale={4} blur={2} far={2} resolution={256} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  )
}

function FloatingParticles() {
  const particleCount = 100

  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const gradientColors = [
      [1.0, 0.6, 0.7],   // Pink
      [1.0, 0.8, 0.5],   // Peach
      [1.0, 1.0, 0.4],   // Yellow
      [0.3, 0.4, 0.95],  // Blue
      [0.3, 0.9, 0.9],   // Cyan
      [0.5, 0.95, 0.55], // Green
    ]

    for (let i = 0; i < particleCount; i++) {
      const radius = 2 + Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const colorIndex = Math.floor(Math.random() * gradientColors.length)
      const color = gradientColors[colorIndex]
      colors[i * 3] = color[0]
      colors[i * 3 + 1] = color[1]
      colors[i * 3 + 2] = color[2]
    }

    return { positions, colors }
  }, [])

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
        size={0.03}
        vertexColors={true}
        blending={AdditiveBlending}
        transparent={true}
        opacity={0.5}
        sizeAttenuation={true}
        map={circleTexture}
      />
    </points>
  )
}

// Create a smooth infinity loop using mathematical lemniscate
function createInfinityCurve(): CatmullRomCurve3 {
  const points: Vector3[] = []
  const segments = 100
  const scale = 1.2
  
  // Lemniscate of Bernoulli parametric equations
  // With slight 3D depth for visual interest
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    
    // Lemniscate formula
    const denom = 1 + Math.sin(t) * Math.sin(t)
    const x = scale * Math.cos(t) / denom
    const y = scale * Math.sin(t) * Math.cos(t) / denom
    // Add subtle z-depth for 3D effect
    const z = 0.15 * Math.sin(t * 2)
    
    points.push(new Vector3(x, y, z))
  }
  
  // Create open curve by removing last few points to create tails
  const openPoints = points.slice(10, points.length - 10)
  
  return new CatmullRomCurve3(openPoints, false, 'catmullrom', 0.5)
}

// Vibrant gradient colors matching the reference
const gradientColors = [
  new Color("#FFB6C1"), // Light pink (start)
  new Color("#FFB088"), // Peach/coral
  new Color("#FFE55C"), // Bright yellow
  new Color("#4169E1"), // Royal blue
  new Color("#40E0D0"), // Turquoise/cyan
  new Color("#7CFC00"), // Bright lime green
  new Color("#4169E1"), // Royal blue (end)
]

function GradientSpline() {
  const meshRef = useRef<Mesh>(null)
  const colorOffsetRef = useRef(0)
  
  // Create the infinity curve
  const curve = useMemo(() => createInfinityCurve(), [])
  
  // Create tube geometry with vertex colors
  const geometry = useMemo(() => {
    const tubularSegments = 150
    const radius = 0.12
    const radialSegments = 24
    
    const tubeGeometry = new TubeGeometry(curve, tubularSegments, radius, radialSegments, false)
    
    const positions = tubeGeometry.attributes.position
    const vertexCount = positions.count
    const colors = new Float32Array(vertexCount * 3)
    
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments
      
      // Smooth interpolation through gradient colors
      const colorT = t * (gradientColors.length - 1)
      const colorIndex = Math.floor(colorT)
      const colorFraction = colorT - colorIndex
      
      const color1 = gradientColors[Math.min(colorIndex, gradientColors.length - 1)]
      const color2 = gradientColors[Math.min(colorIndex + 1, gradientColors.length - 1)]
      
      // Smooth lerp between colors
      const r = color1.r + (color2.r - color1.r) * colorFraction
      const g = color1.g + (color2.g - color1.g) * colorFraction
      const b = color1.b + (color2.b - color1.b) * colorFraction
      
      // Apply to all radial vertices at this tubular segment
      for (let j = 0; j <= radialSegments; j++) {
        const vertexIndex = i * (radialSegments + 1) + j
        if (vertexIndex < vertexCount) {
          colors[vertexIndex * 3] = r
          colors[vertexIndex * 3 + 1] = g
          colors[vertexIndex * 3 + 2] = b
        }
      }
    }
    
    tubeGeometry.setAttribute('color', new BufferAttribute(colors, 3))
    
    return tubeGeometry
  }, [curve])

  useFrame((state) => {
    const isSpeaking = globalSpeakingState
    
    // Animate color flow along the tube
    const speed = isSpeaking ? 0.5 : 0.2
    colorOffsetRef.current = (colorOffsetRef.current + speed * 0.016) % 1
    
    if (meshRef.current && meshRef.current.geometry) {
      const geo = meshRef.current.geometry as TubeGeometry
      const colorAttr = geo.attributes.color
      
      if (colorAttr) {
        const tubularSegments = 150
        const radialSegments = 24
        const vertexCount = colorAttr.count
        const offset = colorOffsetRef.current
        
        for (let i = 0; i <= tubularSegments; i++) {
          const t = ((i / tubularSegments) + offset) % 1
          
          const colorT = t * (gradientColors.length - 1)
          const colorIndex = Math.floor(colorT)
          const colorFraction = colorT - colorIndex
          
          const color1 = gradientColors[Math.min(colorIndex, gradientColors.length - 1)]
          const color2 = gradientColors[Math.min(colorIndex + 1, gradientColors.length - 1)]
          
          const r = color1.r + (color2.r - color1.r) * colorFraction
          const g = color1.g + (color2.g - color1.g) * colorFraction
          const b = color1.b + (color2.b - color1.b) * colorFraction
          
          for (let j = 0; j <= radialSegments; j++) {
            const vertexIndex = i * (radialSegments + 1) + j
            if (vertexIndex < vertexCount) {
              colorAttr.setXYZ(vertexIndex, r, g, b)
            }
          }
        }
        
        colorAttr.needsUpdate = true
      }
    }
    
    // Very gentle floating motion only
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.02
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors={true}
        roughness={0.2}
        metalness={0.05}
        emissive="#ffffff"
        emissiveIntensity={0.15}
      />
    </mesh>
  )
}
