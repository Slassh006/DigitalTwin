"use client"

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface LesionMarkerProps {
    position: [number, number, number];
    stiffness: number;
    confidence: number;
    severity: 'low' | 'moderate' | 'high';
    label?: string;
    showCallout?: boolean;
}

function AnimatedConnectorLine({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
    const lineRef = useRef<THREE.Line>(null);
    const dashRef = useRef(0);

    const geometry = useMemo(() => {
        const points = [start, end];
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [start, end]);

    const material = useMemo(() => {
        return new THREE.LineDashedMaterial({
            color: "#00ffff",
            dashSize: 0.08,
            gapSize: 0.04,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
        });
    }, []);

    useFrame(() => {
        if (lineRef.current) {
            dashRef.current += 0.02;
            (lineRef.current.material as THREE.LineDashedMaterial).dashSize =
                0.06 + Math.sin(dashRef.current * 3) * 0.02;
        }
    });

    return (
        <primitive
            object={new THREE.Line(geometry, material)}
            ref={lineRef}
            computeLineDistances
        />
    );
}

export function LesionMarker({
    position,
    stiffness,
    confidence,
    severity,
    label = "Lesion",
    showCallout = true,
}: LesionMarkerProps) {
    const markerRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    const color = useMemo(() => {
        return severity === 'high'
            ? new THREE.Color(0xff006e)
            : severity === 'moderate'
                ? new THREE.Color(0xffc107)
                : new THREE.Color(0x39ff14);
    }, [severity]);

    const riskScore = useMemo(() => {
        if (severity === 'high') return Math.round(75 + confidence * 25);
        if (severity === 'moderate') return Math.round(40 + confidence * 30);
        return Math.round(10 + confidence * 25);
    }, [severity, confidence]);

    const calloutOffset: [number, number, number] = useMemo(() => {
        const dir = position[0] > 0 ? 1 : -1;
        return [dir * 1.2, 0.8, 0.5];
    }, [position]);

    const markerWorldPos = useMemo(() => new THREE.Vector3(...position), [position]);
    const calloutWorldPos = useMemo(
        () => new THREE.Vector3(
            position[0] + calloutOffset[0],
            position[1] + calloutOffset[1],
            position[2] + calloutOffset[2]
        ),
        [position, calloutOffset]
    );

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (markerRef.current && glowRef.current) {
            const pulse = Math.sin(t * 2.5) * 0.15 + 1.0;
            markerRef.current.scale.setScalar(pulse * 0.12);
            glowRef.current.scale.setScalar(pulse * 0.22);
            markerRef.current.rotation.y = t * 0.8;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = t * 1.2;
            const ringPulse = Math.sin(t * 3) * 0.05 + 1.0;
            ringRef.current.scale.setScalar(ringPulse);
        }
    });

    const severityLabel = severity.toUpperCase();
    const colorHex = '#' + color.getHexString();

    return (
        <group>
            <group position={position}>
                {/* Outer glow sphere */}
                <mesh ref={glowRef}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.2}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>

                {/* Inner core sphere */}
                <mesh ref={markerRef}>
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.9}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                {/* Animated ring */}
                <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.18, 0.012, 16, 48]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.7}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                {/* Second ring (perpendicular) */}
                {severity === 'high' && (
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <torusGeometry args={[0.22, 0.008, 16, 48]} />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={0.4}
                            blending={THREE.AdditiveBlending}
                        />
                    </mesh>
                )}
            </group>

            {/* Animated connecting line from marker to callout */}
            {showCallout && (
                <>
                    <AnimatedConnectorLine start={markerWorldPos} end={calloutWorldPos} />

                    {/* Callout HTML panel */}
                    <Html
                        position={[calloutWorldPos.x, calloutWorldPos.y, calloutWorldPos.z]}
                        distanceFactor={6}
                        style={{ pointerEvents: 'none' }}
                    >
                        <div
                            style={{
                                background: 'rgba(10, 10, 26, 0.92)',
                                border: `1px solid ${colorHex}`,
                                borderRadius: '6px',
                                padding: '8px 12px',
                                fontFamily: 'monospace',
                                fontSize: '10px',
                                color: '#e0f7ff',
                                minWidth: '140px',
                                boxShadow: `0 0 15px ${colorHex}40, inset 0 0 8px ${colorHex}15`,
                                backdropFilter: 'blur(8px)',
                            }}
                        >
                            <div style={{ color: colorHex, fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', letterSpacing: '0.08em' }}>
                                {label}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ color: '#a0d9ff' }}>Stiffness</span>
                                <span style={{ fontWeight: 'bold' }}>{stiffness.toFixed(1)} kPa</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ color: '#a0d9ff' }}>Confidence</span>
                                <span style={{ fontWeight: 'bold' }}>{(confidence * 100).toFixed(0)}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ color: '#a0d9ff' }}>Risk Score</span>
                                <span style={{ fontWeight: 'bold', color: colorHex }}>{riskScore}</span>
                            </div>
                            <div
                                style={{
                                    marginTop: '4px',
                                    padding: '2px 6px',
                                    background: `${colorHex}20`,
                                    borderRadius: '3px',
                                    textAlign: 'center',
                                    color: colorHex,
                                    fontWeight: 'bold',
                                    fontSize: '9px',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                {severityLabel} SEVERITY
                            </div>
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
}
