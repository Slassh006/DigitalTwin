"use client"

import { Layers, Maximize } from "lucide-react"

export default function HolographicViewer() {
    return (
        <section className="relative rounded-xl border border-primary/30 overflow-hidden bg-black flex flex-col shadow-neon-primary group/viz h-full">
            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="bg-black/60 backdrop-blur text-xs font-mono text-accent-cyan px-2 py-1 rounded border border-accent-cyan/30">
                    ID: PT-4922-X
                </div>
                <div className="bg-black/60 backdrop-blur text-xs font-mono text-white px-2 py-1 rounded border border-white/10">
                    ZOOM: 140%
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button className="bg-black/60 backdrop-blur p-2 rounded hover:bg-primary/50 transition-colors text-white border border-white/10">
                    <Layers className="w-4 h-4" />
                </button>
                <button className="bg-black/60 backdrop-blur p-2 rounded hover:bg-primary/50 transition-colors text-white border border-white/10">
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            {/* 3D Viewport */}
            <div className="flex-1 relative flex items-center justify-center hologram-grid overflow-hidden">
                {/* Scanning Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-cyan/10 to-transparent h-[20%] w-full animate-scan z-0 pointer-events-none" />

                {/* Central "Hologram" */}
                <div className="relative w-64 h-64 md:w-80 md:h-80 opacity-90 transition-transform duration-700 ease-in-out group-hover/viz:scale-105">
                    {/* Abstract Uterus Shape Representation using gradients (Placeholder for 3D Canvas) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-full blur-xl animate-pulse" />

                    {/* Main Structure Image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Using the image from reference since we don't have the 3D model loaded here yet */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            alt="3D wireframe holographic model"
                            className="w-full h-full object-contain opacity-80 mix-blend-screen drop-shadow-[0_0_15px_rgba(115,17,212,0.8)]"
                            src="/hologram_wireframe.png"
                            style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                        />
                    </div>

                    {/* Hotspots */}
                    <div className="absolute top-[30%] left-[35%] w-4 h-4 rounded-full bg-accent-magenta shadow-neon-magenta animate-ping" />
                    <div className="absolute top-[30%] left-[35%] w-2 h-2 rounded-full bg-white" />
                    <div className="absolute top-[45%] right-[25%] w-3 h-3 rounded-full bg-accent-magenta/60 shadow-neon-magenta animate-pulse" />
                </div>

                {/* Axis Indicator */}
                <div className="absolute bottom-4 left-4 w-12 h-12 border-l border-b border-accent-cyan/50 p-1">
                    <div className="text-[8px] text-accent-cyan font-mono absolute -top-3 left-0">Y</div>
                    <div className="text-[8px] text-accent-cyan font-mono absolute bottom-0 -right-3">X</div>
                    <div className="w-full h-full border-l border-b border-accent-cyan/20 transform rotate-45 origin-bottom-left" />
                    <div className="text-[8px] text-accent-cyan font-mono absolute top-0 right-0 transform rotate-45">Z</div>
                </div>
            </div>

            {/* Legend/Controls Footer */}
            <div className="h-14 bg-black/80 backdrop-blur border-t border-white/10 flex items-center px-4 justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-400 uppercase">Stiffness Map</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Soft</span>
                        <div className="w-24 h-2 bg-gradient-to-r from-pink-300 via-primary to-accent-magenta rounded-full" />
                        <span className="text-[10px] text-white font-bold">Rigid</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded uppercase font-display tracking-wide text-white transition-colors">
                        Reset View
                    </button>
                </div>
            </div>
        </section>
    )
}
