"use client"

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LesionMarkerProps {
    position: [number, number, number];
    stiffness: number;
    confidence: number;
    severity: 'low' | 'moderate' | 'high';
    label?: string;
    showCallout?: boolean;  // kept for API compatibility but handled externally
}

const SEVERITY_CONFIG = {
    low: { coreR: 0.05, glowR: 0.10, rings: 1, glowStrength: 0.12, color: 0x39ff14, pulseSpeed: 1.5 },
    moderate: { coreR: 0.07, glowR: 0.14, rings: 1, glowStrength: 0.20, color: 0xffc107, pulseSpeed: 2.2 },
    high: { coreR: 0.10, glowR: 0.20, rings: 2, glowStrength: 0.35, color: 0xff006e, pulseSpeed: 3.0 },
} as const;

export function LesionMarker({
    position,
    stiffness,
    confidence,
    severity,
    label = "Lesion",
}: LesionMarkerProps) {
    const markerRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);

    const cfg = SEVERITY_CONFIG[severity];
    const color = useMemo(() => new THREE.Color(cfg.color), [cfg.color]);

    // ── Animation ──────────────────────────────────────────────────────────
    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Pulse core + glow
        const pulse = Math.sin(t * cfg.pulseSpeed) * 0.15 + 1.0;
        if (markerRef.current) {
            markerRef.current.scale.setScalar(pulse * cfg.coreR * 10);
            markerRef.current.rotation.y = t * 0.8;
        }
        if (glowRef.current) {
            glowRef.current.scale.setScalar(pulse * cfg.glowR * 10);
        }

        // Primary ring — steady rotation
        if (ring1Ref.current) {
            ring1Ref.current.rotation.z = t * 1.2;
            const rp = Math.sin(t * cfg.pulseSpeed * 1.5) * 0.04 + 1.0;
            ring1Ref.current.scale.setScalar(rp);
        }

        // Secondary ring (HIGH only) — perpendicular, faster
        if (ring2Ref.current) {
            ring2Ref.current.rotation.y = t * 1.8;
            ring2Ref.current.rotation.x = t * 0.9;
        }
    });

    const colorHex = '#' + color.getHexString();

    return (
        <group position={position}>
            {/* Outer glow sphere — large, transparent */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1, 12, 12]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={cfg.glowStrength}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Inner core sphere — pulsing solid */}
            <mesh ref={markerRef}>
                <sphereGeometry args={[1, 24, 24]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.9}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Moderate/High: bright core highlight */}
            {(severity === 'moderate' || severity === 'high') && (
                <mesh>
                    <sphereGeometry args={[cfg.coreR * 0.4, 16, 16]} />
                    <meshBasicMaterial
                        color={new THREE.Color(0xffffff)}
                        transparent
                        opacity={0.6}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}

            {/* Primary ring */}
            <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[cfg.coreR * 2.2, 0.008, 12, 48]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.75}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Secondary ring — HIGH severity only (perpendicular plane) */}
            {severity === 'high' && (
                <mesh ref={ring2Ref} rotation={[0, 0, Math.PI / 2]}>
                    <torusGeometry args={[cfg.coreR * 2.8, 0.006, 12, 48]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.5}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}

            {/* Third burst ring — HIGH severity, extra emphasis */}
            {severity === 'high' && (
                <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
                    <torusGeometry args={[cfg.coreR * 3.2, 0.004, 8, 48]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.3}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}
        </group>
    );
}
