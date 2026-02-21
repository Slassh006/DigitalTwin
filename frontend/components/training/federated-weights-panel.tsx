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


    return (
        <aside className="glass-panel rounded-xl flex flex-col p-4 overflow-hidden h-full">
            <h3 className="font-display text-xs tracking-widest text-warning uppercase flex items-center gap-2 mb-3 flex-shrink-0">
                <Cpu className="w-3.5 h-3.5" />
                Federated Weights
            </h3>

            <div className="flex-1 flex flex-col justify-around gap-1 overflow-hidden min-h-0">
                {/* Imaging Node */}
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="20" cy="20" fill="none" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="3"></circle>
                            <circle
                                className="drop-shadow-[0_0_5px_#00f0ff] transition-all duration-1000"
                                cx="20" cy="20" fill="none" r="16"
                                stroke="#00f0ff"
                                strokeDasharray="101"
                                strokeDashoffset={101 - (101 * imagingWeight) / 100}
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-[9px] font-bold">{imagingWeight}%</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-accent-cyan truncate">Imaging Node</span>
                        <span className="text-[9px] text-gray-500">Contribution Weight</span>
                    </div>
                </div>

                {/* Clinical Node */}
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="20" cy="20" fill="none" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="3"></circle>
                            <circle
                                className="drop-shadow-[0_0_5px_#ff0055] transition-all duration-1000"
                                cx="20" cy="20" fill="none" r="16"
                                stroke="#ff0055"
                                strokeDasharray="101"
                                strokeDashoffset={101 - (101 * clinicalWeight) / 100}
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-[9px] font-bold">{clinicalWeight}%</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-accent-magenta truncate">Clinical Node</span>
                        <span className="text-[9px] text-gray-500">Contribution Weight</span>
                    </div>
                </div>

                {/* Pathology Node */}
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="20" cy="20" fill="none" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="3"></circle>
                            <circle
                                className="drop-shadow-[0_0_5px_#0bda73] transition-all duration-1000"
                                cx="20" cy="20" fill="none" r="16"
                                stroke="#0bda73"
                                strokeDasharray="101"
                                strokeDashoffset={101 - (101 * pathologyWeight) / 100}
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-[9px] font-bold">{pathologyWeight}%</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-success truncate">Pathology Node</span>
                        <span className="text-[9px] text-gray-500">Contribution Weight</span>
                    </div>
                </div>
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 flex-shrink-0">
                <div className="text-[9px] text-gray-500 font-mono mb-1.5 uppercase">Aggregation Strategy</div>
                <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-white/10 rounded text-[9px] border border-white/20 text-white">FedAvg</span>
                    <span className="px-2 py-0.5 bg-transparent rounded text-[9px] border border-white/10 text-gray-500">FedProx</span>
                </div>
            </div>
        </aside>
    )
}
