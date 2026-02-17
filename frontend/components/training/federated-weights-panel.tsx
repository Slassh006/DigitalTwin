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

    const imagingWeight = metrics ? Math.round(metrics.node_performance.imaging.contribution * 100) : 0
    const clinicalWeight = metrics ? Math.round(metrics.node_performance.clinical.contribution * 100) : 0
    const pathologyWeight = metrics ? Math.round(metrics.node_performance.pathology.contribution * 100) : 0

    // Helper for circular progress DashArray (r=20 -> circum=126)
    const getDashOffset = (percentage: number) => {
        return 126 - (126 * percentage) / 100
    }

    return (
        <aside className="glass-panel rounded-xl flex flex-col p-5 overflow-y-auto h-full">
            <h3 className="font-display text-sm tracking-widest text-warning uppercase flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4" />
                Federated Weights
            </h3>

            <div className="flex-1 flex flex-col justify-around">
                {/* Imaging Node */}
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" fill="none" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="4"></circle>
                            <circle
                                className="drop-shadow-[0_0_5px_#00f0ff] transition-all duration-1000"
                                cx="24" cy="24" fill="none" r="20"
                                stroke="#00f0ff"
                                strokeDasharray="126"
                                strokeDashoffset={getDashOffset(imagingWeight)}
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold">{imagingWeight}%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-accent-cyan">Imaging Node</span>
                        <span className="text-[10px] text-gray-400">Contribution Weight</span>
                    </div>
                </div>

                {/* Clinical Node */}
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" fill="none" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="4"></circle>
                            <circle
                                className="drop-shadow-[0_0_5px_#ff0055] transition-all duration-1000"
                                cx="24" cy="24" fill="none" r="20"
                                stroke="#ff0055"
                                strokeDasharray="126"
                                strokeDashoffset={getDashOffset(clinicalWeight)}
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold">{clinicalWeight}%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-accent-magenta">Clinical Node</span>
                        <span className="text-[10px] text-gray-400">Contribution Weight</span>
                    </div>
                </div>

                {/* Pathology Node */}
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" fill="none" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="4"></circle>
                            <circle
                                className="drop-shadow-[0_0_5px_#0bda73] transition-all duration-1000"
                                cx="24" cy="24" fill="none" r="20"
                                stroke="#0bda73"
                                strokeDasharray="126"
                                strokeDashoffset={getDashOffset(pathologyWeight)}
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold">{pathologyWeight}%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-success">Pathology Node</span>
                        <span className="text-[10px] text-gray-400">Contribution Weight</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase">Aggregation Strategy</div>
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-white/10 rounded text-[10px] border border-white/20 text-white">FedAvg</span>
                    <span className="px-2 py-1 bg-transparent rounded text-[10px] border border-white/10 text-gray-500">FedProx</span>
                </div>
            </div>
        </aside>
    )
}
