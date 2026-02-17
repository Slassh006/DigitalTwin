"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function HolographicParticles({ count = 200 }) {
    const mesh = useRef<THREE.Points>(null);

    const particles = useMemo(() => {
        const temp = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            temp[i * 3] = (Math.random() - 0.5) * 10; // X
            temp[i * 3 + 1] = (Math.random() - 0.5) * 10; // Y
            temp[i * 3 + 2] = (Math.random() - 0.5) * 10; // Z
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.rotation.y = state.clock.getElapsedTime() * 0.05;
            mesh.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.2;
        }
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particles.length / 3}
                    array={particles}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.03}
                color="#00ffff"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

export function HolographicGrid() {
    const gridRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (gridRef.current) {
            // Pulse opacity
            const opacity = 0.2 + Math.sin(state.clock.getElapsedTime()) * 0.1;
            gridRef.current.children.forEach((child) => {
                if (child instanceof THREE.LineSegments) {
                    (child.material as THREE.LineBasicMaterial).opacity = opacity;
                }
            });
        }
    });

    return (
        <group ref={gridRef} position={[0, -2, 0]}>
            {/* Main Grid */}
            <gridHelper args={[20, 20, 0x00ffff, 0x00ffff]} position={[0, 0, 0]}>
                <lineBasicMaterial attach="material" color="#00ffff" transparent opacity={0.2} />
            </gridHelper>
            {/* Secondary Grid for depth */}
            <gridHelper args={[20, 40, 0xff00ff, 0x000000]} position={[0, -0.1, 0]}>
                <lineBasicMaterial attach="material" color="#ff00ff" transparent opacity={0.1} />
            </gridHelper>
        </group>
    );
}
