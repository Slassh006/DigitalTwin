"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"

export default function PINNArchitectureViz() {
    // PINN Configuration: Input (x,t) -> 4 Hidden Layers -> Output (u,v,p)
    // We visualize a subset of neurons for clarity but keep layer count accurate
    const networkConfig = useMemo(() => [2, 6, 6, 6, 6, 3], [])
    const layerNames = ["INPUT (x,t)", "HIDDEN 1", "HIDDEN 2", "HIDDEN 3", "HIDDEN 4", "OUTPUT (u,v,p)"]

    // Animation state
    const [activeLayer, setActiveLayer] = useState(0)

    // Simulate forward pass propogation
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveLayer(prev => (prev + 1) % (networkConfig.length + 2)) // +2 for pause
        }, 800)
        return () => clearInterval(interval)
    }, [networkConfig.length])

    // Calculate node positions
    const width = 600
    const height = 300
    const layerSpacing = width / (networkConfig.length + 1)

    const getNodePos = (layerIdx: number, nodeIdx: number, totalNodes: number) => {
        const x = (layerIdx + 1) * layerSpacing
        // Center nodes vertically
        const nodeSpacing = 40
        const totalHeight = (totalNodes - 1) * nodeSpacing
        const y = (height / 2) - (totalHeight / 2) + (nodeIdx * nodeSpacing)
        return { x, y }
    }

    return (
        <section className="relative rounded-xl border border-primary/30 overflow-hidden bg-black flex flex-col shadow-neon-primary h-full">
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-black/60 backdrop-blur text-xs font-display text-white px-3 py-1.5 rounded border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
                    PINN ARCHITECTURE VISUALIZATION
                </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center hologram-grid overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5"></div>

                <div className="absolute top-4 right-4 flex flex-col items-end z-10">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Architecture</div>
                    <div className="text-xs font-mono text-accent-cyan">4 x 64 Fully Connected</div>
                    <div className="text-[10px] font-mono text-accent-magenta mt-1">Activation: Tanh</div>
                </div>

                <svg className="w-full h-full max-w-3xl mx-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                    <defs>
                        <filter id="glow-node">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Connections */}
                    {networkConfig.map((nodeCount, layerIdx) => {
                        if (layerIdx === networkConfig.length - 1) return null
                        const nextNodeCount = networkConfig[layerIdx + 1]
                        const isActive = activeLayer === layerIdx

                        // Generate all connections between current layer and next layer
                        return Array.from({ length: nodeCount }).map((_, i) => (
                            Array.from({ length: nextNodeCount }).map((_, j) => {
                                const start = getNodePos(layerIdx, i, nodeCount)
                                const end = getNodePos(layerIdx + 1, j, nextNodeCount)
                                return (
                                    <motion.line
                                        key={`conn-${layerIdx}-${i}-${j}`}
                                        x1={start.x}
                                        y1={start.y}
                                        x2={end.x}
                                        y2={end.y}
                                        stroke={isActive ? "#00f0ff" : "#ff0055"}
                                        strokeWidth={isActive ? 1.5 : 0.5}
                                        strokeOpacity={isActive ? 0.8 : 0.15}
                                        initial={false}
                                        animate={{
                                            stroke: isActive ? "#00f0ff" : "#333",
                                            strokeOpacity: isActive ? 0.6 : 0.1
                                        }}
                                        transition={{ duration: 0.5 }}
                                    />
                                )
                            })
                        ))
                    })}

                    {/* Nodes */}
                    {networkConfig.map((nodeCount, layerIdx) => (
                        <g key={`layer-${layerIdx}`}>
                            {Array.from({ length: nodeCount }).map((_, i) => {
                                const pos = getNodePos(layerIdx, i, nodeCount)
                                const isInput = layerIdx === 0
                                const isOutput = layerIdx === networkConfig.length - 1
                                const isActive = activeLayer === layerIdx || activeLayer === layerIdx - 1

                                return (
                                    <motion.circle
                                        key={`node-${layerIdx}-${i}`}
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={isInput || isOutput ? 6 : 4}
                                        fill={isInput ? "#00f0ff" : isOutput ? "#ff0055" : "white"}
                                        filter={isActive ? "url(#glow-node)" : ""}
                                        opacity={isActive ? 1 : 0.5}
                                        animate={{
                                            scale: isActive ? 1.2 : 1,
                                            fillOpacity: isActive ? 1 : 0.5
                                        }}
                                        transition={{ duration: 0.3 }}
                                    />
                                )
                            })}
                            {/* Layer Labels */}
                            <text
                                x={getNodePos(layerIdx, 0, nodeCount).x}
                                y={height - 20}
                                textAnchor="middle"
                                fill="white"
                                fontSize="8"
                                fontFamily="monospace"
                                opacity="0.6"
                            >
                                {layerNames[layerIdx]}
                            </text>
                        </g>
                    ))}
                </svg>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${activeLayer < networkConfig.length ? "bg-accent-cyan shadow-[0_0_5px_cyan]" : "bg-gray-700"}`} />
                        <span className={activeLayer < networkConfig.length ? "text-accent-cyan" : ""}>Forward Pass</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${activeLayer >= networkConfig.length ? "bg-accent-magenta shadow-[0_0_5px_magenta]" : "bg-gray-700"}`} />
                        <span className={activeLayer >= networkConfig.length ? "text-accent-magenta" : ""}>Backpropagation</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
