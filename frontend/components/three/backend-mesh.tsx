"use client"

import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface BackendMeshProps {
    stiffness: number;
    meshUrl?: string;
}

function LoadedMesh({ meshUrl }: { meshUrl: string }) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(meshUrl);

    // Clone scene for the schematic wireframe overlay
    const wireframeScene = useMemo(() => scene.clone(), [scene]);

    // Material 1: Solid Core (Faint glow)
    const solidMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color("#0044aa"),
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }, []);

    // Material 2: Wireframe Overlay (Bright Sci-Fi Blue)
    const wireframeMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color("#00ffff"),
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
    }, []);

    // Apply materials
    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = solidMaterial;
                }
            });
        }
        if (wireframeScene) {
            wireframeScene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = wireframeMaterial;
                }
            });
        }
    }, [scene, wireframeScene, solidMaterial, wireframeMaterial]);

    // Animate Color & Rotation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;

            const time = state.clock.elapsedTime;

            // Pulse the Wireframe
            // Oscillate around Cyan (0.5).
            // Let's keep it TIGHTLY Cyan/Blue.
            const hue = 0.5 + (Math.sin(time * 0.5) * 0.5 + 0.5) * 0.1; // 0.5 to 0.6
            wireframeMaterial.color.setHSL(hue, 1.0, 0.5);
            wireframeMaterial.opacity = 0.4 + (Math.sin(time * 2) * 0.5 + 0.5) * 0.4;

            // Pulse the Solid Core slightly differently
            solidMaterial.opacity = 0.05 + (Math.sin(time) * 0.5 + 0.5) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Inner Solid Mass */}
            <primitive object={scene} scale={1.5} />
            {/* Outer Wireframe Shell */}
            <primitive object={wireframeScene} scale={1.505} />
        </group>
    );
}

function FallbackMesh() {
    const meshRef = useRef<THREE.Group>(null);
    const geometry = useMemo(() => new THREE.CapsuleGeometry(1.0, 2.0, 16, 32), []);

    const solidMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: new THREE.Color("#0044aa"),
        transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false
    }), []);

    const wireframeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: new THREE.Color("#00ffff"),
        wireframe: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    }), []);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;

            const time = state.clock.elapsedTime;
            const hue = 0.5 + (Math.sin(time * 0.5) * 0.5 + 0.5) * 0.1;
            wireframeMaterial.color.setHSL(hue, 1.0, 0.5);
            wireframeMaterial.opacity = 0.4 + (Math.sin(time * 2) * 0.5 + 0.5) * 0.4;
        }
    });

    return (
        <group ref={meshRef}>
            <mesh geometry={geometry} material={solidMaterial} />
            <mesh geometry={geometry} material={wireframeMaterial} scale={1.01} />
        </group>
    );
}

export function BackendMesh({ stiffness, meshUrl }: BackendMeshProps) {
    if (meshUrl) {
        return <LoadedMesh meshUrl={meshUrl} />;
    }
    return <FallbackMesh />;
}
