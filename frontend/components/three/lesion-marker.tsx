"use client"

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LesionMarkerProps {
    position: [number, number, number];
    stiffness: number;
    confidence: number;
    severity: 'low' | 'moderate' | 'high';
    label?: string;
}

export function LesionMarker({
    position,
    stiffness,
    confidence,
    severity,
    label = "Lesion"
}: LesionMarkerProps) {
    const markerRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    // Color based on severity
    const color = severity === 'high'
        ? new THREE.Color(0xff006e)  // Magenta-red
        : severity === 'moderate'
            ? new THREE.Color(0xffc107)  // Amber
            : new THREE.Color(0xff9800); // Orange

    // Pulsating animation
    useFrame((state) => {
        if (markerRef.current && glowRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 1.0;
            markerRef.current.scale.setScalar(pulse * 0.15);
            glowRef.current.scale.setScalar(pulse * 0.25);

            // Rotate slowly
            markerRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <group position={position}>
            {/* Outer glow */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Inner core */}
            <mesh ref={markerRef}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2.0}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Warning indicator ring */}
            {severity === 'high' && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.2, 0.02, 16, 32]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.6}
                    />
                </mesh>
            )}
        </group>
    );
}
