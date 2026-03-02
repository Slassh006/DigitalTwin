"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows, Sphere } from "@react-three/drei";
import { Loader2 } from "lucide-react";

interface GlbViewerProps {
    showLesion?: boolean;
    stiffness?: number;
    patientFeatures?: any;
}

function LesionMarker({ position, scale, intensity }: { position: [number, number, number], scale: number, intensity: number }) {
    const meshRef = useRef<any>();

    // Animate the lesion to pulse relative to intensity
    useFrame((state) => {
        if (meshRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 4) * (0.01 + intensity * 0.005);
            meshRef.current.scale.setScalar(scale + pulse);
        }
    });

    return (
        <Sphere ref={meshRef} args={[1, 32, 32]} position={position}>
            <meshStandardMaterial
                color="#ef4444"
                emissive="#991b1b"
                emissiveIntensity={0.6 + (intensity * 0.2)}
                transparent={true}
                opacity={0.85}
                roughness={0.2}
                metalness={0.8}
            />
        </Sphere>
    );
}

function AnatomyScene({ showLesion, stiffness, features }: { showLesion: boolean, stiffness: number, features: any }) {
    const { scene } = useGLTF("/uterus3DModal.glb");

    // The internal GLTF coordinates based on bounding box:
    // X axis (Left/Right width) = approx -0.50 to 0.50
    // Z axis (Top/Bottom height) = approx -0.46 (cervix) to 0.46 (fundus)
    // Y axis (Front/Back thickness) = approx -0.16 to 0.16

    // Default fallback values if features missing
    const lesionCount = features?.lesion_count || (showLesion ? 1 : 0);
    // Base size ranges from 0.02 to 0.08 based on inputs (the model itself is only 1.0 unit across!)
    const sizeFromModel = (features?.max_lesion_size_mm || 15) / 1000.0; // mm to roughly meters in model scale
    const scale = Math.min(0.12, Math.max(0.03, sizeFromModel * 2.0));

    // Normalizing stiffness (1-15 kPa) to an intensity multiplier (0-1)
    const intensity = Math.min(1.0, stiffness / 10.0);

    return (
        <group scale={2.5} position={[0, -0.5, 0]}>
            <primitive object={scene}>
                {/* We attach the markers DIRECTLY into the scene's coordinate system so they stay anchored correctly */}

                {/* 1st Lesion: Central Endometrial Cavity (overlapping the modeled mass) */}
                {lesionCount >= 1 && (
                    <LesionMarker position={[0.0, 0.0, 0.12]} scale={scale * 1.5} intensity={intensity} />
                )}

                {/* 2nd Lesion: Left Ovary / Adnexa */}
                {lesionCount >= 2 && (
                    <LesionMarker position={[-0.42, 0.0, -0.08]} scale={scale} intensity={intensity} />
                )}

                {/* 3rd Lesion: Right Ovary / Adnexa */}
                {lesionCount >= 3 && (
                    <LesionMarker position={[0.42, 0.0, -0.08]} scale={scale} intensity={intensity} />
                )}

                {/* 4th Lesion: Deep Infiltrating / Posterior Wall */}
                {lesionCount >= 4 && (
                    <LesionMarker position={[0.0, -0.12, -0.1]} scale={scale * 0.8} intensity={intensity} />
                )}

                {/* 5th Lesion: Cervical region */}
                {lesionCount >= 5 && (
                    <LesionMarker position={[0.0, 0.0, -0.35]} scale={scale * 0.6} intensity={intensity} />
                )}
            </primitive>
        </group>
    );
}

function Loader() {
    return (
        <div className="absolute inset-0 flex items-center justify-center text-primary z-20">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2 font-mono text-sm">Loading 3D Anatomy...</span>
        </div>
    );
}

export function GlbViewer({ showLesion = false, stiffness = 1, patientFeatures = {} }: GlbViewerProps) {
    return (
        <div className="w-full h-full relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
            <Canvas camera={{ position: [0, 0, 3], fov: 45 }} className="w-full h-full absolute inset-0 z-0">
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 10]} intensity={1.5} />
                <directionalLight position={[-10, 5, -5]} intensity={0.8} />
                <directionalLight position={[0, -10, 0]} intensity={0.3} />
                <Environment preset="city" />

                <Suspense fallback={null}>
                    <AnatomyScene showLesion={showLesion} stiffness={stiffness} features={patientFeatures} />
                    <ContactShadows position={[0, -1.8, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                </Suspense>

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={2}
                    maxDistance={25}
                    autoRotate={true}
                    autoRotateSpeed={0.8}
                />
            </Canvas>

            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white tracking-widest">ANATOMICAL REFERENCE</span>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10 p-3 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-xs text-slate-300 font-mono text-center">
                Interactive real-time 3D model. Scroll to Zoom, click and drag to orbit.
            </div>
        </div>
    );
}

// Preload the model so it caches early
useGLTF.preload("/uterus3DModal.glb");
