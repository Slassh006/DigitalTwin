"use client"

import { Suspense, useState, useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { BackendMesh } from "./backend-mesh";
import { LesionMarker } from "./lesion-marker";
import { HolographicParticles, HolographicGrid } from "./holographic-effects";
import { DataPanel, StiffnessBar } from "../visualization/data-panel";
import type { PredictionResponse, LesionData } from "@/types/prediction";

/**
 * RotatingGroup
 * Must live inside <Canvas> so it can call useFrame.
 * Wraps the uterus mesh + lesion markers so they all rotate together,
 * keeping anatomical alignment between markers and mesh surface.
 */
function RotatingGroup({ speed = 0.1, children }: { speed?: number; children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * speed;
        }
    });
    return <group ref={groupRef}>{children}</group>;
}

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

    // ── Lesion Positions (fixed anatomy, stiffness computed from real prediction) ──────────
    const LESION_ANATOMY = [
        { id: "L001", position: [-0.8, 0.6, 0.3] as [number, number, number], label: "Left Ovary Lesion", relStiff: 1.5 },
        { id: "L002", position: [0.6, 0.3, -0.2] as [number, number, number], label: "Right Tube Adhesion", relStiff: 0.85 },
        { id: "L003", position: [0.0, -0.4, 0.5] as [number, number, number], label: "Cervical Region", relStiff: 0.30 },
    ];

    // When API returns lesions, use them directly.
    // Otherwise derive stiffness & confidence from the real prediction result.
    const lesions: LesionData[] = predictionData?.lesions
        ? predictionData.lesions
        : predictionData
            ? (() => {
                const actualStiff = stiffness;          // kPa from /predict
                const actualConf = predictionData.confidence;
                const count = predictionData.prediction > 0.6 ? 3
                    : predictionData.prediction > 0.3 ? 2 : 1;
                return LESION_ANATOMY.slice(0, count).map(a => {
                    const s = Math.max(0.3, Math.min(14.0, actualStiff * a.relStiff));
                    const sev: 'low' | 'moderate' | 'high' = s >= 5 ? 'high' : s >= 2 ? 'moderate' : 'low';
                    return {
                        id: a.id, position: a.position, label: a.label,
                        stiffness: s, confidence: actualConf, severity: sev
                    };
                });
            })()
            : LESION_ANATOMY.map(a => ({   // no prediction yet — marker positions only, callouts hidden by flag below
                id: a.id, position: a.position, label: a.label,
                stiffness: 3.0, confidence: 0.5, severity: 'moderate' as const
            }));

    // Real hover stiffness comes from BackendMesh onHoverStiffness callback (per-vertex GPU attribute)
    const handleHoverStiffness = useCallback((kPa: number | null) => {
        setHoveredStiffness(kPa);
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

                {/* RotatingGroup: mesh + markers spin together → anatomical alignment guaranteed */}
                <Suspense fallback={null}>
                    <RotatingGroup speed={0.1}>
                        <BackendMesh
                            stiffness={stiffness}
                            meshUrl={actualMeshUrl}
                            heatmapEnabled={heatmapEnabled}
                            onHoverStiffness={handleHoverStiffness}
                        />
                        {lesions.map((lesion) => (
                            <LesionMarker
                                key={lesion.id}
                                position={lesion.position}
                                stiffness={lesion.stiffness}
                                confidence={lesion.confidence}
                                severity={lesion.severity}
                                label={lesion.label}
                                showCallout={false}
                            />
                        ))}
                    </RotatingGroup>

                    {/* Tooltip sits outside RotatingGroup — tracks cursor, not model */}
                    {hoveredStiffness !== null && (
                        <StiffnessTooltip stiffness={hoveredStiffness} />
                    )}
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

                {/* Post Processing: Bloom */}
                <EffectComposer multisampling={8}>
                    <Bloom
                        intensity={1.2}
                        luminanceThreshold={0.7}
                        luminanceSmoothing={0.025}
                        mipmapBlur
                        radius={0.5}
                    />
                </EffectComposer>

                {/* Controls — autoRotate removed (replaced by RotatingGroup) */}
                <OrbitControls
                    enableZoom={true}
                    enablePan={true}
                    minDistance={2}
                    maxDistance={10}
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

            {/* ── Lesion Callout Cards — right edge, below toggle buttons, never blocks uterus ── */}
            {predictionData && calloutsEnabled && lesions.length > 0 && (
                <div
                    className="absolute flex flex-col gap-1.5 z-20 pointer-events-none"
                    style={{ top: '5.5rem', right: '0.75rem', width: '148px' }}
                >
                    {lesions.map((lesion) => {
                        const c = lesion.severity === 'high' ? '#ff006e'
                            : lesion.severity === 'moderate' ? '#ffc107'
                                : '#39ff14';
                        const riskScore = lesion.severity === 'high' ? Math.round(75 + lesion.confidence * 25)
                            : lesion.severity === 'moderate' ? Math.round(40 + lesion.confidence * 30)
                                : Math.round(10 + lesion.confidence * 25);
                        return (
                            <div key={lesion.id} style={{
                                background: 'rgba(8,8,22,0.92)',
                                border: `1px solid ${c}`,
                                borderRadius: '6px',
                                padding: '6px 9px',
                                fontFamily: 'monospace',
                                fontSize: '9px',
                                color: '#e0f7ff',
                                boxShadow: `0 0 10px ${c}30`,
                                backdropFilter: 'blur(8px)',
                            }}>
                                {/* Label */}
                                <div style={{
                                    color: c, fontWeight: 'bold', fontSize: '9.5px', marginBottom: '4px',
                                    borderBottom: `1px solid ${c}30`, paddingBottom: '3px'
                                }}>
                                    {lesion.label}
                                </div>
                                {/* Data rows */}
                                {[
                                    ['Stiffness', `${lesion.stiffness.toFixed(1)} kPa`],
                                    ['Confidence', `${(lesion.confidence * 100).toFixed(0)}%`],
                                    ['Risk Score', String(riskScore)],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                        <span style={{ color: '#a0d9ff' }}>{k}</span>
                                        <span style={{ fontWeight: 'bold', color: k === 'Risk Score' ? c : '#e0f7ff' }}>{v}</span>
                                    </div>
                                ))}
                                {/* Severity badge */}
                                <div style={{
                                    marginTop: '4px', textAlign: 'center', color: c,
                                    fontWeight: 'bold', fontSize: '8px', letterSpacing: '0.1em',
                                    background: `${c}15`, borderRadius: '3px', padding: '1px 0'
                                }}>
                                    {lesion.severity.toUpperCase()} SEVERITY
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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

            {/* Tissue Analysis Panel — top-left but below the HUD label (which is top-4) */}
            {predictionData && (
                <div
                    className="absolute left-4 z-20"
                    style={{
                        top: '4.5rem',
                        backdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(10,14,39,0.85)',
                        border: `1px solid ${stiffness < 2 ? '#39ff14' : stiffness < 5 ? '#ffc107' : '#ff006e'}`,
                        boxShadow: `0 0 18px ${stiffness < 2 ? '#39ff1440' : stiffness < 5 ? '#ffc10740' : '#ff006e40'}`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        minWidth: '200px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                    }}
                >
                    <div style={{ color: stiffness < 2 ? '#39ff14' : stiffness < 5 ? '#ffc107' : '#ff006e', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                        Tissue Analysis
                    </div>
                    {[
                        ['Stiffness', `${stiffness.toFixed(2)} kPa`],
                        ['Confidence', `${(predictionData.confidence * 100).toFixed(0)}%`],
                        ['Risk Level', (predictionData.risk_level ?? 'UNKNOWN').toUpperCase()],
                        ['Lesions Detected', String(lesions.length)],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 mb-1">
                            <span style={{ color: '#a0d9ff' }}>{k}:</span>
                            <span style={{ color: '#e0f7ff', fontWeight: 'bold' }}>{v}</span>
                        </div>
                    ))}
                </div>
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
