"use client"

import { useState, useEffect } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { Activity } from "lucide-react"
import { generateLongitudinalData } from "@/lib/simulation-engine"

export default function LongitudinalTrendAnalysis() {
    const [data, setData] = useState<any[]>([])

    useEffect(() => {
        setData(generateLongitudinalData())
    }, [])

    return (
        <section className="glass-panel rounded-xl flex flex-col overflow-hidden relative group h-full">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                    <Activity className="text-accent-cyan w-5 h-5" />
                    <h3 className="font-display text-sm tracking-widest text-white uppercase">Longitudinal Trend Analysis</h3>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 px-2">
                        <span className="w-3 h-0.5 bg-accent-cyan"></span>
                        <span className="text-[10px] uppercase text-gray-400">Probability Score</span>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <span className="w-3 h-0.5 bg-accent-magenta"></span>
                        <span className="text-[10px] uppercase text-gray-400">Tissue Stiffness (kPa)</span>
                    </div>
                    <select className="bg-black/40 border border-white/10 text-xs text-gray-300 rounded px-2 py-1 outline-none focus:border-primary">
                        <option>Last 12 Months</option>
                        <option>Last 24 Months</option>
                        <option>All History</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 w-full relative min-h-[300px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="month"
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Space Mono' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Space Mono' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="prob"
                            stroke="#00f0ff"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorProb)"
                        />
                        <Area
                            type="monotone"
                            dataKey="stiffness"
                            stroke="#ff0055"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            fill="none"
                        />
                        <ReferenceLine x="AUG" stroke="white" strokeDasharray="3 3" />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Prediction Tag Overlay */}
                <div className="absolute left-[63%] top-[25%] bg-black/80 backdrop-blur border border-accent-cyan/50 p-2 rounded text-xs z-10 hidden group-hover:block transition-opacity pointer-events-none">
                    <div className="text-accent-cyan font-bold mb-1">Month 8 Prediction</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        <span className="text-gray-400">Prob:</span> <span className="text-white text-right">0.82</span>
                        <span className="text-gray-400">Stiff:</span> <span className="text-white text-right">38kPa</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
