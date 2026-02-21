"use client"

import { Cpu } from "lucide-react"
import { useEffect, useState } from "react"
import { getAnalyticsMetrics, AnalyticsMetrics } from "@/lib/api"

export default function FederatedWeightsPanel() {
    const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAnalyticsMetrics()
                setMetrics(data)
            } catch (error) {
                console.error("Failed to fetch federated weights", error)
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [])

    const imagingWeight = metrics ? Math.round(metrics.node_performance.imaging.contribution * 100) : 42
    const clinicalWeight = metrics ? Math.round(metrics.node_performance.clinical.contribution * 100) : 31
    const pathologyWeight = metrics ? Math.round(metrics.node_performance.pathology.contribution * 100) : 27

    const nodes = [
        { label: "Imaging", pct: imagingWeight, color: "#00f0ff", glow: "#00f0ff" },
        { label: "Clinical", pct: clinicalWeight, color: "#ff0055", glow: "#ff0055" },
        { label: "Pathology", pct: pathologyWeight, color: "#0bda73", glow: "#0bda73" },
    ]

    // r=14 → circumference = 2π*14 ≈ 88
    const C = 88

    return (
        <aside className="glass-panel rounded-xl flex flex-col p-3 h-full overflow-hidden">
            {/* Header */}
            <h3 className="font-display text-[10px] tracking-widest text-warning uppercase flex items-center gap-1.5 mb-2 flex-shrink-0">
                <Cpu className="w-3 h-3" />
                Federated Weights
            </h3>

            {/* 3-column horizontal node row — always fits regardless of panel height */}
            <div className="flex-1 flex items-center justify-around min-h-0">
                {nodes.map(({ label, pct, color, glow }) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                        {/* Ring */}
                        <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                                <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                                <circle
                                    cx="16" cy="16" r="14" fill="none"
                                    stroke={color}
                                    strokeWidth="2.5"
                                    strokeDasharray={C}
                                    strokeDashoffset={C - (C * pct) / 100}
                                    strokeLinecap="round"
                                    style={{ filter: `drop-shadow(0 0 4px ${glow})`, transition: "stroke-dashoffset 1s ease" }}
                                />
                            </svg>
                            <span className="absolute text-[8px] font-bold font-mono" style={{ color }}>{pct}%</span>
                        </div>
                        {/* Label */}
                        <span className="text-[9px] font-display tracking-wide text-gray-400 text-center leading-tight">{label}</span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 pt-2 mt-1 border-t border-white/10">
                <div className="text-[8px] text-gray-600 font-mono uppercase mb-1">Aggregation</div>
                <div className="flex gap-1.5">
                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] border border-white/20 text-white">FedAvg</span>
                    <span className="px-1.5 py-0.5 bg-transparent rounded text-[8px] border border-white/10 text-gray-600">FedProx</span>
                </div>
            </div>
        </aside>
    )
}
