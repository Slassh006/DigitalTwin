"use client"

import { Cpu } from "lucide-react"

export default function FederatedWeightsPanel() {
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
                                className="drop-shadow-[0_0_5px_#00f0ff]"
                                cx="24" cy="24" fill="none" r="20"
                                stroke="#00f0ff"
                                strokeDasharray="126"
                                strokeDashoffset="30"
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold">75%</span>
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
                                className="drop-shadow-[0_0_5px_#ff0055]"
                                cx="24" cy="24" fill="none" r="20"
                                stroke="#ff0055"
                                strokeDasharray="126"
                                strokeDashoffset="60"
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold">52%</span>
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
                                className="drop-shadow-[0_0_5px_#0bda73]"
                                cx="24" cy="24" fill="none" r="20"
                                stroke="#0bda73"
                                strokeDasharray="126"
                                strokeDashoffset="10"
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold">92%</span>
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
