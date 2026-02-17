"use client"

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { holographicVertexShader, holographicFragmentShader } from "@/shaders/holographic-material";

interface HolographicMeshProps {
    geometry: THREE.BufferGeometry;
    baseColor: THREE.Color;
    glowColor?: THREE.Color;
    glowIntensity?: number;
    scanLineSpeed?: number;
}

export function HolographicMesh({
    geometry,
    baseColor,
    glowColor = new THREE.Color(0x00ffff), // Cyan
    glowIntensity = 1.5,
    scanLineSpeed = 2.0
}: HolographicMeshProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Animate shader uniforms
    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
            <shaderMaterial
                ref={materialRef}
                vertexShader={holographicVertexShader}
                fragmentShader={holographicFragmentShader}
                uniforms={{
                    glowColor: { value: glowColor },
                    glowIntensity: { value: glowIntensity },
                    scanLineSpeed: { value: scanLineSpeed },
                    time: { value: 0 },
                    baseColor: { value: baseColor }
                }}
                transparent
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}
