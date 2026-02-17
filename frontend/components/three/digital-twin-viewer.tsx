"use client"

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { BackendMesh } from "./backend-mesh";
import { LesionMarker } from "./lesion-marker";
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

    // Mock lesion data if not provided
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
        <div className="w-full h-full relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
                <pointLight position={[0, 10, 0]} intensity={0.3} color="#00ffff" />

                {/* 3D Model */}
                <Suspense fallback={null}>
                    <BackendMesh stiffness={stiffness} meshUrl={actualMeshUrl} />
                </Suspense>

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
            <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded">
                Drag to rotate • Scroll to zoom
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
