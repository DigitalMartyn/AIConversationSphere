"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, extend } from "@react-three/fiber"
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
import type { Mesh, MeshStandardMaterial } from "three"

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
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} shadows>
        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-3, 2, 3]} intensity={0.4} color="#ff69b4" />
        <pointLight position={[3, 2, -3]} intensity={0.4} color="#00ffff" />

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
  const particleCount = 150

  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const gradientColors = [
      [1.0, 0.75, 0.6],  // Peach
      [1.0, 1.0, 0.5],   // Yellow
      [0.4, 0.5, 1.0],   // Blue
      [0.4, 0.9, 0.9],   // Cyan
      [0.5, 0.9, 0.6],   // Green
      [0.85, 0.6, 0.9],  // Pink/Lavender
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
        opacity={0.6}
        sizeAttenuation={true}
        map={circleTexture}
      />
    </points>
  )
}

// Create an open flowing curve that loops like the reference image
function createSplineCurve(): CatmullRomCurve3 {
  const points: Vector3[] = []
  
  // Hand-crafted control points to create the looping shape from the reference
  // This creates an open curve (not closed) that weaves through itself
  const controlPoints = [
    // Start at bottom left, going up
    new Vector3(-0.8, -1.2, 0),
    new Vector3(-0.6, -0.6, 0.1),
    new Vector3(-0.3, 0, 0.2),
    // Loop around to the left (peach/orange loop)
    new Vector3(-0.8, 0.3, 0.1),
    new Vector3(-1.1, 0.1, -0.1),
    new Vector3(-1.0, -0.3, -0.2),
    new Vector3(-0.6, -0.4, -0.1),
    // Cross over and go up right
    new Vector3(-0.2, -0.2, 0.1),
    new Vector3(0.2, 0.2, 0.2),
    // Upper pink section going right and down
    new Vector3(0.4, 0.6, 0.1),
    new Vector3(0.7, 0.8, -0.1),
    new Vector3(0.9, 0.5, -0.2),
    // Curve down into the bottom right loop (cyan/green)
    new Vector3(0.8, 0.1, -0.1),
    new Vector3(0.5, -0.3, 0.1),
    new Vector3(0.2, -0.5, 0.2),
    // Bottom loop
    new Vector3(0.4, -0.8, 0.1),
    new Vector3(0.8, -0.7, -0.1),
    new Vector3(1.0, -0.4, -0.2),
    new Vector3(0.9, -0.1, -0.1),
    // Exit going up and to the right
    new Vector3(0.7, 0.2, 0.1),
    new Vector3(0.5, 0.5, 0.2),
    new Vector3(0.3, 0.9, 0.1),
  ]
  
  const curve = new CatmullRomCurve3(controlPoints, false) // false = open curve
  return curve
}

// Gradient colors matching the reference: peach -> yellow -> blue -> cyan -> green -> pink/lavender
const gradientColors = [
  new Color("#F5C09A"), // Peach/Orange
  new Color("#F7D86C"), // Yellow
  new Color("#5B7FE1"), // Blue
  new Color("#5BD4D4"), // Cyan
  new Color("#7EE08A"), // Green
  new Color("#D4A5E8"), // Pink/Lavender
]

function GradientSpline() {
  const meshRef = useRef<Mesh>(null)
  const colorOffsetRef = useRef(0)
  
  // Create the spline curve
  const curve = useMemo(() => createSplineCurve(), [])
  
  // Create tube geometry with vertex colors
  const geometry = useMemo(() => {
    const tubeGeometry = new TubeGeometry(curve, 200, 0.12, 24, false)
    
    // Get the position attribute to determine how many vertices we have
    const positions = tubeGeometry.attributes.position
    const vertexCount = positions.count
    
    // Create color attribute
    const colors = new Float32Array(vertexCount * 3)
    
    // Get the tube parameters to calculate position along curve
    const tubularSegments = 200
    const radialSegments = 24
    
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments
      
      // Interpolate through the gradient colors
      const colorT = t * (gradientColors.length - 1)
      const colorIndex = Math.floor(colorT)
      const colorFraction = colorT - colorIndex
      
      const color1 = gradientColors[Math.min(colorIndex, gradientColors.length - 1)]
      const color2 = gradientColors[Math.min(colorIndex + 1, gradientColors.length - 1)]
      
      // Lerp between colors
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
    const speed = isSpeaking ? 0.4 : 0.15
    colorOffsetRef.current = (colorOffsetRef.current + speed * 0.016) % 1
    
    if (meshRef.current && meshRef.current.geometry) {
      const geo = meshRef.current.geometry as TubeGeometry
      const colorAttr = geo.attributes.color
      
      if (colorAttr) {
        const tubularSegments = 200
        const radialSegments = 24
        const vertexCount = colorAttr.count
        const offset = colorOffsetRef.current
        
        for (let i = 0; i <= tubularSegments; i++) {
          // Offset the t value for animation
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
    
    // Gentle floating motion only
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors={true}
        roughness={0.3}
        metalness={0.1}
        emissive="#ffffff"
        emissiveIntensity={0.1}
      />
    </mesh>
  )
}
