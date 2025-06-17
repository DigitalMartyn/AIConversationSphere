"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei"
import { CanvasTexture, ShaderMaterial } from "three"

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
  const materialRef = useRef()

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

  // Custom shader material for ripple effect
  const rippleMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        gradientTexture: { value: gradientTexture },
        rippleSpeed: { value: 2.0 },
        rippleFrequency: { value: 8.0 },
        rippleAmplitude: { value: 0.02 },
      },
      vertexShader: `
        uniform float time;
        uniform float rippleSpeed;
        uniform float rippleFrequency;
        uniform float rippleAmplitude;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          // Create ripple effect
          float ripple = sin(position.x * rippleFrequency + time * rippleSpeed) * 
                        sin(position.y * rippleFrequency + time * rippleSpeed) * 
                        sin(position.z * rippleFrequency + time * rippleSpeed);
          
          vec3 newPosition = position + normal * ripple * rippleAmplitude;
          vPosition = newPosition;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D gradientTexture;
        uniform float time;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec4 gradientColor = texture2D(gradientTexture, vUv);
          
          // Add subtle ripple highlight
          float rippleHighlight = sin(vPosition.x * 8.0 + time * 2.0) * 
                                 sin(vPosition.y * 8.0 + time * 2.0) * 
                                 sin(vPosition.z * 8.0 + time * 2.0);
          
          vec3 finalColor = gradientColor.rgb + rippleHighlight * 0.1;
          
          gl_FragColor = vec4(finalColor, gradientColor.a);
        }
      `,
      transparent: true,
      opacity: 0.85,
    })
  }, [gradientTexture])

  useFrame((state) => {
    if (meshRef.current) {
      // Position sphere and add subtle floating animation
      meshRef.current.position.y = 0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }

    if (materialRef.current) {
      // Update ripple animation time
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[1.125, 128, 128]} />
      <meshPhysicalMaterial
        ref={materialRef}
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
        // Add displacement for ripple effect
        displacementMap={gradientTexture}
        displacementScale={0.02}
      />
    </mesh>
  )
}
