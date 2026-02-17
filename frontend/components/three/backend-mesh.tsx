"use client"

import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface BackendMeshProps {
    stiffness: number;
    meshUrl?: string;
}

function LoadedMesh({ meshUrl, stiffness, fallbackGeometry, color }: {
    meshUrl: string;
    stiffness: number;
    fallbackGeometry: THREE.BufferGeometry;
    color: THREE.Color;
}) {
    const groupRef = useRef<THREE.Group>(null);

    // Load GLTF model
    const { scene } = useGLTF(meshUrl);

    // Apply color to all meshes in the scene
    useEffect(() => {
        if (scene) {
            console.log("✅ Loaded uterus GLB from:", meshUrl);
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: color,
                        roughness: 0.4,
                        metalness: 0.2,
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }
    }, [scene, color, meshUrl]);

    // Auto-rotation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={scene} scale={1.5} />
        </group>
    );
}

function FallbackMesh({ fallbackGeometry, color }: {
    fallbackGeometry: THREE.BufferGeometry;
    color: THREE.Color;
}) {
    const groupRef = useRef<THREE.Group>(null);

    // Gentle animation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <mesh geometry={fallbackGeometry} castShadow receiveShadow>
                <meshStandardMaterial
                    color={color}
                    roughness={0.4}
                    metalness={0.2}
                    envMapIntensity={0.5}
                />
            </mesh>
        </group>
    );
}

export function BackendMesh({ stiffness, meshUrl }: BackendMeshProps) {
    // Create fallback procedural geometry - simple capsule that works
    const fallbackGeometry = useMemo(() => {
        return new THREE.CapsuleGeometry(1.0, 2.0, 16, 32);
    }, []);

    // Color based on stiffness
    const color = useMemo(() => {
        if (stiffness < 2) {
            return new THREE.Color(0.2, 0.8, 0.4); // Green
        } else if (stiffness < 5) {
            return new THREE.Color(0.9, 0.7, 0.2); // Yellow
        } else {
            return new THREE.Color(0.9, 0.2, 0.2); // Red
        }
    }, [stiffness]);

    // Use LoadedMesh if meshUrl is provided, otherwise use FallbackMesh
    if (meshUrl) {
        return <LoadedMesh meshUrl={meshUrl} stiffness={stiffness} fallbackGeometry={fallbackGeometry} color={color} />;
    }

    return <FallbackMesh fallbackGeometry={fallbackGeometry} color={color} />;
}
