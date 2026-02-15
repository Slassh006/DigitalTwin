"use client"

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface UterusMeshProps {
    stiffness: number;
}

export function UterusMesh({ stiffness }: UterusMeshProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create simplified uterus geometry (capsule-like shape)
    const geometry = useMemo(() => {
        // Create main body
        const bodyGeometry = new THREE.CapsuleGeometry(0.8, 1.5, 32, 64);

        // Create cervix (lower neck)
        const cervixGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 16, 32);
        cervixGeometry.translate(0, -1.2, 0);

        // Merge geometries
        const mergedGeometry = new THREE.BufferGeometry();
        const bodyPositions = bodyGeometry.attributes.position;
        const cervixPositions = cervixGeometry.attributes.position;

        const positions = new Float32Array(
            bodyPositions.count * 3 + cervixPositions.count * 3
        );

        positions.set(bodyPositions.array, 0);
        positions.set(cervixPositions.array, bodyPositions.count * 3);

        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        mergedGeometry.computeVertexNormals();

        return mergedGeometry;
    }, []);

    // Color based on stiffness
    const color = useMemo(() => {
        // Healthy: Green (< 2 kPa)
        // Moderate: Yellow (2-5 kPa)
        // Endometriosis: Red (> 5 kPa)

        if (stiffness < 2) {
            return new THREE.Color(0.2, 0.8, 0.4); // Green
        } else if (stiffness < 5) {
            return new THREE.Color(0.9, 0.7, 0.2); // Yellow
        } else {
            return new THREE.Color(0.9, 0.2, 0.2); // Red
        }
    }, [stiffness]);

    // Gentle animation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
                color={color}
                roughness={0.4}
                metalness={0.2}
                envMapIntensity={0.5}
            />
        </mesh>
    );
}
