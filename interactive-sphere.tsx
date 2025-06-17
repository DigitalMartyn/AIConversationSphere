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

  // Custom shader material
  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        gradientTexture: { value: gradientTexture },
        opacity: { value: 0.85 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform sampler2D gradientTexture;
        uniform float opacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          // Sample the gradient texture
          vec4 gradientColor = texture2D(gradientTexture, vUv);
          
          // Create animated ripple effects using world position
          float dist = length(vWorldPosition.xz);
          float ripple1 = sin(dist * 8.0 + time * 2.0) * 0.1;
          float ripple2 = sin(vWorldPosition.y * 6.0 + time * 1.5) * 0.08;
          float ripple3 = sin(dot(vWorldPosition, vec3(1.0, 1.0, 1.0)) * 4.0 + time * 3.0) * 0.06;
          
          // Combine ripples
          float totalRipple = ripple1 + ripple2 + ripple3;
          
          // Create animated brightness variation
          float brightness = 1.0 + totalRipple;
          
          // Apply ripple effect to the gradient colors
          vec3 finalColor = gradientColor.rgb * brightness;
          
          // Add some emissive glow effect
          vec3 emissive = finalColor * 0.2;
          finalColor += emissive;
          
          // Add fresnel effect for edge lighting
          float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          finalColor += vec3(1.0) * fresnel * 0.3;
          
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
    })
  }, [gradientTexture])

  useFrame((state) => {
    if (meshRef.current) {
      // Position sphere and add subtle floating animation
      meshRef.current.position.y = 0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }

    // Update shader time uniform
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[1.125, 128, 128]} />
      <primitive object={shaderMaterial} ref={materialRef} />
    </mesh>
  )
}
