"use client"

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BackendMesh } from "./backend-mesh";
import { LesionMarker } from "./lesion-marker";
import { HolographicParticles, HolographicGrid } from "./holographic-effects";
import { DataPanel, StiffnessBar } from "../visualization/data-panel";
import type { PredictionResponse, LesionData } from "@/types/prediction";

interface DigitalTwinViewerProps {
    stiffness: number;
    meshUrl?: string;
    predictionData?: PredictionResponse;
}

export function DigitalTwinViewer({ stiffness, meshUrl, predictionData }: DigitalTwinViewerProps) {
    // Default to uterus GLB model if no meshUrl provided
    const actualMeshUrl = meshUrl || "/models/uterus.glb";

    // Mock lesion data if not provided (Ensure IDs are unique string)
    const lesions: LesionData[] = predictionData?.lesions || (
        stiffness > 5 ? [
            {
                id: "L001",
                position: [-0.8, 0.6, 0],
                stiffness: 7.2,
                confidence: 0.85,
                severity: "high",
                label: "Left Ovary Lesion"
            }
        ] : []
    );

    return (
        <div className="w-full h-full relative bg-slate-950 rounded-lg overflow-hidden border border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
            <Canvas shadows gl={{ antialias: false }}>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />

                {/* Lighting - Cooler Sci-Fi Tones */}
                <ambientLight intensity={0.2} color="#001133" />
                <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={2} color="#00ffff" castShadow />
                <pointLight position={[-5, 0, -5]} intensity={1.5} color="#ff00ff" />
                <pointLight position={[5, -5, 0]} intensity={1.0} color="#0000ff" />

                {/* 3D Model with Holographic Material */}
                <Suspense fallback={null}>
                    <BackendMesh stiffness={stiffness} meshUrl={actualMeshUrl} />
                </Suspense>

                {/* Particle Field */}
                <HolographicParticles count={500} />

                {/* Holographic Grid (Floor & Background) */}
                <group position={[0, -2, 0]}>
                    <HolographicGrid />
                </group>
                <group position={[0, 0, -3]} rotation={[Math.PI / 2, 0, 0]}>
                    <HolographicGrid />
                </group>

                {/* Lesion Markers */}
                {lesions.map((lesion) => (
                    <LesionMarker
                        key={lesion.id}
                        position={lesion.position}
                        stiffness={lesion.stiffness}
                        confidence={lesion.confidence}
                        severity={lesion.severity}
                        label={lesion.label}
                    />
                ))}

                {/* Post Processing: Bloom */}
                <EffectComposer enabled={true}>
                    <Bloom
                        intensity={1.5}
                        luminanceThreshold={0.85}
                        luminanceSmoothing={0.02}
                        height={300}
                    />
                </EffectComposer>

                {/* Controls */}
                <OrbitControls
                    enableZoom={true}
                    enablePan={true}
                    minDistance={2}
                    maxDistance={10}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
            </Canvas>

            {/* Controls HUD */}
            <div className="absolute top-4 left-4 text-accent-cyan text-xs font-mono bg-black/60 border border-accent-cyan/30 px-3 py-1 rounded backdrop-blur-sm">
                SYSTEM.VISUALIZATION_MODE = HOLOGRAM
                <br />
                DRAG TO ROTATE • SCROLL TO ZOOM
            </div>

            {/* Tissue Analysis Panel */}
            {predictionData && (
                <DataPanel
                    title="TISSUE ANALYSIS"
                    position="top-right"
                    data={{
                        "Stiffness": `${stiffness.toFixed(1)} kPa`,
                        "Confidence": `${(predictionData.confidence * 100).toFixed(0)}%`,
                        "Risk Level": predictionData.risk_level.toUpperCase(),
                        "Lesions Detected": lesions.length
                    }}
                />
            )}

            {/* Regional Stiffness Breakdown */}
            {predictionData?.regional_analysis && (
                <div
                    className="absolute bottom-4 left-4 right-4 z-10"
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(10, 14, 39, 0.8)',
                        border: '1px solid #00d9ff',
                        boxShadow: '0 0 20px #00d9ff40',
                        borderRadius: '8px',
                        padding: '16px'
                    }}
                >
                    <div
                        className="text-xs font-bold mb-3"
                        style={{
                            color: '#00d9ff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}
                    >
                        REGIONAL STIFFNESS MAP
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(predictionData.regional_analysis).map(([region, data]) => (
                            data && (
                                <StiffnessBar
                                    key={region}
                                    label={region.replace('_', ' ').toUpperCase()}
                                    value={data.stiffness}
                                    max={10}
                                />
                            )
                        ))}
                    </div>
                </div>
            )}

            {/* Node Contributions (if available) */}
            {predictionData?.node_contributions && (
                <DataPanel
                    title="AI NODE CONTRIBUTIONS"
                    position="bottom-right"
                    accentColor="#ff006e"
                    data={{
                        "Imaging": `${(predictionData.node_contributions.imaging * 100).toFixed(0)}%`,
                        "Clinical": `${(predictionData.node_contributions.clinical * 100).toFixed(0)}%`,
                        "Pathology": `${(predictionData.node_contributions.pathology * 100).toFixed(0)}%`
                    }}
                />
            )}
        </div>
    );
}
