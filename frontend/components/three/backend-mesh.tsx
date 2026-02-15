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
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

    // Try to load GLTF using drei's useGLTF hook (only when meshUrl exists)
    let gltf = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        gltf = useGLTF(meshUrl);
    } catch (error) {
        console.warn("⚠️ Failed to load backend mesh, using procedural fallback:", error);
    }

    useEffect(() => {
        if (gltf && gltf.scene) {
            console.log("✅ Loaded backend mesh from:", meshUrl);
            // Extract geometry from loaded model
            gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                    setGeometry(child.geometry);
                }
            });
        }
    }, [gltf, meshUrl]);

    // Gentle animation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
        }
    });

    const finalGeometry = geometry || fallbackGeometry;

    return (
        <group ref={groupRef}>
            <mesh geometry={finalGeometry} castShadow receiveShadow>
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
    // Create fallback procedural geometry
    const fallbackGeometry = useMemo(() => {
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
