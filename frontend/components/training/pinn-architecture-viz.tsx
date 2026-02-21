"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"

// ─── EndoPINN architecture ────────────────────────────────────────────────────
// Multimodal input (3 modalities) → 4 × 64 hidden (Tanh) → 2 outputs
// Visual node counts: input=3, hidden×4=6 each, output=2
// Real dims displayed as labels.
// ─────────────────────────────────────────────────────────────────────────────

const MODALITY_COLORS = ["#00f0ff", "#ff0055", "#0bda73"] // imaging, clinical, pathology
const OUTPUT_COLORS = ["#ffd166", "#ff0055"]             // risk prob, stiffness

const NETWORK: number[] = [3, 6, 6, 6, 6, 2]
const LAYER_META = [
    { name: "INPUT", sub: "imaging · clinical · path" },
    { name: "HIDDEN 1", sub: "64 neurons" },
    { name: "HIDDEN 2", sub: "64 neurons" },
    { name: "HIDDEN 3", sub: "64 neurons" },
    { name: "HIDDEN 4", sub: "64 neurons" },
    { name: "OUTPUT", sub: "risk · stiffness" },
]

const W = 640
const H = 260
const LAYER_SPACING = W / (NETWORK.length + 1)

function getPos(layerIdx: number, nodeIdx: number, total: number) {
    const x = (layerIdx + 1) * LAYER_SPACING
    const nodeSpacing = 36
    const totalH = (total - 1) * nodeSpacing
    const y = H / 2 - totalH / 2 + nodeIdx * nodeSpacing
    return { x, y }
}

export default function PINNArchitectureViz() {
    const [activeLayer, setActiveLayer] = useState(0)
    const [phase, setPhase] = useState<"forward" | "backward">("forward")

    useEffect(() => {
        const id = setInterval(() => {
            setActiveLayer(prev => {
                const next = prev + 1
                if (next >= NETWORK.length + 1) {
                    setPhase(p => p === "forward" ? "backward" : "forward")
                    return 0
                }
                return next
            })
        }, 700)
        return () => clearInterval(id)
    }, [])

    return (
        <section className="relative rounded-xl border border-primary/30 overflow-hidden bg-black flex flex-col shadow-neon-primary h-full">

            {/* Badge */}
            <div className="absolute top-3 left-3 z-10">
                <div className="bg-black/60 backdrop-blur text-[10px] font-display text-white px-3 py-1 rounded border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                    PINN ARCHITECTURE VISUALIZATION
                </div>
            </div>

            {/* Arch info */}
            <div className="absolute top-3 right-3 z-10 flex flex-col items-end">
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-0.5">Architecture</div>
                <div className="text-[11px] font-mono text-accent-cyan">4 × 64 Fully Connected</div>
                <div className="text-[9px] font-mono text-accent-magenta mt-0.5">Activation: Tanh · Dropout: 0.1</div>
                <div className="text-[9px] font-mono text-gray-500 mt-0.5">Physics Loss: BCE + Stiffness Constraint</div>
            </div>

            {/* SVG Canvas */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <svg
                    className="w-full h-full max-w-3xl mx-auto"
                    viewBox={`-20 10 ${W + 40} ${H + 20}`}
                    style={{ overflow: "visible" }}
                >
                    <defs>
                        <filter id="glow-en">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Connections */}
                    {NETWORK.map((count, li) => {
                        if (li === NETWORK.length - 1) return null
                        const nextCount = NETWORK[li + 1]
                        const isActive = activeLayer === li

                        return Array.from({ length: count }, (_, i) =>
                            Array.from({ length: nextCount }, (_, j) => {
                                const s = getPos(li, i, count)
                                const e = getPos(li + 1, j, nextCount)
                                return (
                                    <motion.line
                                        key={`c-${li}-${i}-${j}`}
                                        x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                                        animate={{
                                            stroke: isActive
                                                ? (phase === "forward" ? "#00f0ff" : "#ff0055")
                                                : "#222",
                                            strokeOpacity: isActive ? 0.7 : 0.12,
                                            strokeWidth: isActive ? 1.5 : 0.5,
                                        }}
                                        transition={{ duration: 0.4 }}
                                    />
                                )
                            })
                        )
                    })}

                    {/* Nodes + Layer labels */}
                    {NETWORK.map((count, li) => {
                        const isInput = li === 0
                        const isOutput = li === NETWORK.length - 1
                        const isActive = activeLayer === li || activeLayer === li - 1
                        const meta = LAYER_META[li]

                        return (
                            <g key={`layer-${li}`}>
                                {Array.from({ length: count }, (_, ni) => {
                                    const pos = getPos(li, ni, count)
                                    const color = isInput
                                        ? MODALITY_COLORS[ni]
                                        : isOutput
                                            ? OUTPUT_COLORS[ni]
                                            : "#fff"
                                    return (
                                        <motion.circle
                                            key={`n-${li}-${ni}`}
                                            cx={pos.x} cy={pos.y}
                                            r={isInput || isOutput ? 7 : 5}
                                            fill={color}
                                            filter={isActive ? "url(#glow-en)" : ""}
                                            animate={{
                                                fillOpacity: isActive ? 1.0 : 0.35,
                                                r: isActive
                                                    ? (isInput || isOutput ? 8 : 6)
                                                    : (isInput || isOutput ? 7 : 5),
                                            }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    )
                                })}

                                {/* Layer label — positioned ABOVE the nodes, not at bottom */}
                                <text
                                    x={getPos(li, 0, count).x}
                                    y={H + 15}
                                    textAnchor="middle"
                                    fill={isInput ? "#00f0ff" : isOutput ? "#ffd166" : "rgba(255,255,255,0.7)"}
                                    fontSize="7"
                                    fontFamily="monospace"
                                    fontWeight={isActive ? "bold" : "normal"}
                                >
                                    {meta.name}
                                </text>
                                <text
                                    x={getPos(li, 0, count).x}
                                    y={H + 25}
                                    textAnchor="middle"
                                    fill="rgba(150,180,220,0.6)"
                                    fontSize="6"
                                    fontFamily="monospace"
                                >
                                    {meta.sub}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>

            {/* Legend bar — completely separate from SVG, no overlap */}
            <div className="flex-shrink-0 flex items-center justify-center gap-8 py-2 border-t border-white/5 text-[9px] font-mono uppercase tracking-wider">
                {/* Modality legend */}
                {[["#00f0ff", "Imaging 128d"], ["#ff0055", "Clinical 64d"], ["#0bda73", "Pathology 64d"]].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c as string, boxShadow: `0 0 4px ${c}` }} />
                        <span className="text-gray-500">{l}</span>
                    </div>
                ))}
                <div className="w-px h-4 bg-white/10" />
                {/* Phase indicator */}
                <div className="flex items-center gap-1.5">
                    <motion.span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        animate={{ background: phase === "forward" ? "#00f0ff" : "#ff0055" }}
                    />
                    <span className={phase === "forward" ? "text-accent-cyan" : "text-accent-magenta"}>
                        {phase === "forward" ? "Forward Pass" : "Backprop"}
                    </span>
                </div>
            </div>
        </section>
    )
}
