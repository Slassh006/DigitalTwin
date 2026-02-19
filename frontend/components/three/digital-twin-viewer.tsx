"use client"

import { Suspense, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
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

function StiffnessTooltip({ stiffness }: { stiffness: number }) {
    const color = stiffness < 2 ? '#39ff14' : stiffness < 5 ? '#ffc107' : '#ff006e';
    const label = stiffness < 2 ? 'HEALTHY' : stiffness < 5 ? 'MODERATE' : 'LESION';
    return (
        <Html center distanceFactor={5} style={{ pointerEvents: 'none' }}>
            <div style={{
                background: 'rgba(10,10,26,0.9)',
                border: `1px solid ${color}`,
                borderRadius: '4px',
                padding: '4px 10px',
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#e0f7ff',
                whiteSpace: 'nowrap',
                boxShadow: `0 0 12px ${color}40`,
            }}>
                <span style={{ color, fontWeight: 'bold' }}>{stiffness.toFixed(1)} kPa</span>
                <span style={{ color: '#a0d9ff', marginLeft: '6px' }}>{label}</span>
            </div>
        </Html>
    );
}

export function DigitalTwinViewer({ stiffness, meshUrl, predictionData }: DigitalTwinViewerProps) {
    const [heatmapEnabled, setHeatmapEnabled] = useState(true);
    const [calloutsEnabled, setCalloutsEnabled] = useState(true);
    const [hoveredStiffness, setHoveredStiffness] = useState<number | null>(null);

    const actualMeshUrl = meshUrl || "/models/uterus.glb";

    const defaultLesions: LesionData[] = [
        {
            id: "L001",
            position: [-0.8, 0.6, 0.3],
            stiffness: 7.2,
            confidence: 0.85,
            severity: "high",
            label: "Left Ovary Lesion"
        },
        {
            id: "L002",
            position: [0.6, 0.3, -0.2],
            stiffness: 3.8,
            confidence: 0.72,
            severity: "moderate",
            label: "Right Tube Adhesion"
        },
        {
            id: "L003",
            position: [0.0, -0.4, 0.5],
            stiffness: 1.4,
            confidence: 0.91,
            severity: "low",
            label: "Cervical Region"
        }
    ];

    const lesions: LesionData[] = predictionData?.lesions || defaultLesions;

    const handlePointerMove = useCallback((e: any) => {
        if (e?.point) {
            const y = e.point.y;
            const simulated = Math.max(0.5, stiffness + Math.sin(y * 3) * 2);
            setHoveredStiffness(parseFloat(simulated.toFixed(1)));
        }
    }, [stiffness]);

    const handlePointerLeave = useCallback(() => {
        setHoveredStiffness(null);
    }, []);

    return (
        <div className="w-full h-full relative rounded-lg overflow-hidden border border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.1)]" style={{ backgroundColor: '#0a0a1a' }}>
            <Canvas
                gl={{
                    antialias: true,
                    toneMapping: 3,
                    toneMappingExposure: 1.2,
                }}
                onPointerMissed={() => setHoveredStiffness(null)}
            >
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />

                {/* Lighting */}
                <ambientLight intensity={0.15} color="#001133" />
                <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.8} color="#00ffff" castShadow />
                <pointLight position={[-5, 0, -5]} intensity={1.2} color="#ff00ff" />
                <pointLight position={[5, -5, 0]} intensity={0.8} color="#0000ff" />
                <pointLight position={[0, 5, 3]} intensity={0.5} color="#00ffff" />

                {/* 3D Model */}
                <Suspense fallback={null}>
                    <group
                        onPointerMove={handlePointerMove}
                        onPointerLeave={handlePointerLeave}
                    >
                        <BackendMesh
                            stiffness={stiffness}
                            meshUrl={actualMeshUrl}
                            heatmapEnabled={heatmapEnabled}
                        />
                        {hoveredStiffness !== null && (
                            <StiffnessTooltip stiffness={hoveredStiffness} />
                        )}
                    </group>
                </Suspense>

                {/* Particles */}
                <HolographicParticles count={500} />

                {/* Holographic Grid */}
                <group position={[0, -2, 0]}>
                    <HolographicGrid />
                </group>
                <group position={[0, 0, -3]} rotation={[Math.PI / 2, 0, 0]}>
                    <HolographicGrid />
                </group>

                {/* Lesion Markers + Callouts */}
                {lesions.map((lesion) => (
                    <LesionMarker
                        key={lesion.id}
                        position={lesion.position}
                        stiffness={lesion.stiffness}
                        confidence={lesion.confidence}
                        severity={lesion.severity}
                        label={lesion.label}
                        showCallout={calloutsEnabled}
                    />
                ))}

                {/* Post Processing: UnrealBloom + FXAA */}
                <EffectComposer multisampling={8}>
                    <Bloom
                        intensity={1.2}
                        luminanceThreshold={0.7}
                        luminanceSmoothing={0.025}
                        mipmapBlur
                        radius={0.5}
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

            {/* HUD: Mode Label */}
            <div className="absolute top-4 left-4 text-xs font-mono bg-black/60 border border-cyan-500/30 px-3 py-1.5 rounded backdrop-blur-sm" style={{ color: '#00ffff' }}>
                SYSTEM.VISUALIZATION_MODE = HOLOGRAM
                <br />
                DRAG TO ROTATE &bull; SCROLL TO ZOOM
            </div>

            {/* Toggle Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                <button
                    onClick={() => setHeatmapEnabled(!heatmapEnabled)}
                    className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded backdrop-blur-sm transition-all"
                    style={{
                        background: heatmapEnabled ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.6)',
                        border: `1px solid ${heatmapEnabled ? '#00ffff' : '#334'}`,
                        color: heatmapEnabled ? '#00ffff' : '#667',
                    }}
                >
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: heatmapEnabled ? '#00ffff' : '#334',
                        boxShadow: heatmapEnabled ? '0 0 6px #00ffff' : 'none',
                    }} />
                    HEATMAP
                </button>
                <button
                    onClick={() => setCalloutsEnabled(!calloutsEnabled)}
                    className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded backdrop-blur-sm transition-all"
                    style={{
                        background: calloutsEnabled ? 'rgba(255,0,255,0.15)' : 'rgba(0,0,0,0.6)',
                        border: `1px solid ${calloutsEnabled ? '#ff00ff' : '#334'}`,
                        color: calloutsEnabled ? '#ff00ff' : '#667',
                    }}
                >
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: calloutsEnabled ? '#ff00ff' : '#334',
                        boxShadow: calloutsEnabled ? '0 0 6px #ff00ff' : 'none',
                    }} />
                    CALLOUTS
                </button>
            </div>

            {/* Stiffness Legend */}
            <div className="absolute bottom-4 left-4 z-10">
                <div style={{
                    background: 'rgba(10,10,26,0.85)',
                    border: '1px solid #00d9ff40',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                }}>
                    <div style={{ color: '#00d9ff', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '0.08em', fontSize: '9px' }}>
                        STIFFNESS SCALE (kPa)
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#39ff14', display: 'inline-block' }} />
                        <span style={{ color: '#a0d9ff' }}>&lt; 2 kPa</span>
                        <span style={{ color: '#e0f7ff', marginLeft: 'auto' }}>Healthy</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ffc107', display: 'inline-block' }} />
                        <span style={{ color: '#a0d9ff' }}>2–5 kPa</span>
                        <span style={{ color: '#e0f7ff', marginLeft: 'auto' }}>Moderate</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ff006e', display: 'inline-block' }} />
                        <span style={{ color: '#a0d9ff' }}>&gt; 5 kPa</span>
                        <span style={{ color: '#e0f7ff', marginLeft: 'auto' }}>Lesion</span>
                    </div>
                </div>
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
                    className="absolute bottom-4 left-48 right-4 z-10"
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(10, 14, 39, 0.8)',
                        border: '1px solid #00d9ff',
                        boxShadow: '0 0 20px #00d9ff40',
                        borderRadius: '8px',
                        padding: '16px'
                    }}
                >
                    <div style={{ color: '#00d9ff', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', fontSize: '11px', marginBottom: '10px' }}>
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

            {/* Node Contributions */}
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
