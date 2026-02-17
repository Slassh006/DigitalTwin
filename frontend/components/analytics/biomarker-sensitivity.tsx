"use client"

import { BarChart2 } from "lucide-react"

export default function BiomarkerSensitivity() {
    return (
        <section className="glass-panel rounded-xl flex flex-col h-full">
            <div className="p-3 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-display text-xs tracking-widest text-white uppercase">Biomarker Sensitivity</h3>
                <BarChart2 className="text-gray-500 w-4 h-4" />
            </div>
            <div className="flex-1 p-4 flex flex-col justify-center space-y-4">
                <div>
                    <div className="flex justify-between text-[10px] uppercase text-gray-400 mb-1">
                        <span>CA-125</span>
                        <span className="text-accent-cyan">High Impact</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="bg-accent-cyan h-full w-[85%] shadow-neon-cyan"></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] uppercase text-gray-400 mb-1">
                        <span>IL-6 Cytokine</span>
                        <span className="text-accent-magenta">Critical</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="bg-accent-magenta h-full w-[92%] shadow-neon-magenta"></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] uppercase text-gray-400 mb-1">
                        <span>TNF-Alpha</span>
                        <span className="text-primary">Moderate</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full w-[60%]"></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] uppercase text-gray-400 mb-1">
                        <span>VEGF-A</span>
                        <span className="text-gray-500">Low</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="bg-gray-600 h-full w-[35%]"></div>
                    </div>
                </div>
            </div>
        </section>
    )
}
