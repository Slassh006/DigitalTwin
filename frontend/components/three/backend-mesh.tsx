"use client"

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import hologramVertexShader from "./shaders/hologram.vert.glsl";
import hologramFragmentShader from "./shaders/hologram.frag.glsl";

interface BackendMeshProps {
    stiffness: number;
    meshUrl?: string;
    heatmapEnabled?: boolean;
}

function createHologramMaterial(stiffness: number, heatmapEnabled: boolean) {
    return new THREE.ShaderMaterial({
        vertexShader: hologramVertexShader,
        fragmentShader: hologramFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color("#00ffff") },
            uColor2: { value: new THREE.Color("#ff00ff") },
            uOpacity: { value: 0.7 },
            uStiffness: { value: stiffness },
            uHeatmapEnabled: { value: heatmapEnabled ? 1.0 : 0.0 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

function LoadedMesh({ meshUrl, stiffness, heatmapEnabled = true }: { meshUrl: string; stiffness: number; heatmapEnabled?: boolean }) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(meshUrl);

    const hologramMaterial = useMemo(
        () => createHologramMaterial(stiffness, heatmapEnabled),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = hologramMaterial;
                }
            });
        }
    }, [scene, hologramMaterial]);

    useEffect(() => {
        hologramMaterial.uniforms.uStiffness.value = stiffness;
        hologramMaterial.uniforms.uHeatmapEnabled.value = heatmapEnabled ? 1.0 : 0.0;
    }, [stiffness, heatmapEnabled, hologramMaterial]);

    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;
        hologramMaterial.uniforms.uTime.value = elapsed;

        if (groupRef.current) {
            groupRef.current.rotation.y = elapsed * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <primitive object={scene} scale={1.5} />
        </group>
    );
}

function FallbackMesh({ stiffness, heatmapEnabled = true }: { stiffness: number; heatmapEnabled?: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const geometry = useMemo(() => new THREE.CapsuleGeometry(1.0, 2.0, 32, 64), []);
    const hologramMaterial = useMemo(
        () => createHologramMaterial(stiffness, heatmapEnabled),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(() => {
        hologramMaterial.uniforms.uStiffness.value = stiffness;
        hologramMaterial.uniforms.uHeatmapEnabled.value = heatmapEnabled ? 1.0 : 0.0;
    }, [stiffness, heatmapEnabled, hologramMaterial]);

    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;
        hologramMaterial.uniforms.uTime.value = elapsed;

        if (meshRef.current) {
            meshRef.current.rotation.y = elapsed * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry} material={hologramMaterial} />
    );
}

export function BackendMesh({ stiffness, meshUrl, heatmapEnabled = true }: BackendMeshProps) {
    if (meshUrl) {
        return <LoadedMesh meshUrl={meshUrl} stiffness={stiffness} heatmapEnabled={heatmapEnabled} />;
    }
    return <FallbackMesh stiffness={stiffness} heatmapEnabled={heatmapEnabled} />;
}
