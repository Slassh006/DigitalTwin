"use client"

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { BackendMesh } from "./backend-mesh";

interface DigitalTwinViewerProps {
    stiffness: number;
    meshUrl?: string;
}

export function DigitalTwinViewer({ stiffness, meshUrl }: DigitalTwinViewerProps) {
    return (
        <div className="w-full h-full relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* 3D Model - Now supports backend mesh loading */}
                <Suspense fallback={null}>
                    <BackendMesh stiffness={stiffness} meshUrl={meshUrl} />
                </Suspense>

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

            {/* Loading Overlay */}
            <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded">
                Drag to rotate • Scroll to zoom
            </div>

            {/* Mesh Source Indicator */}
            {meshUrl && (
                <div className="absolute bottom-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
                    Backend mesh loaded
                </div>
            )}
        </div>
    );
}
