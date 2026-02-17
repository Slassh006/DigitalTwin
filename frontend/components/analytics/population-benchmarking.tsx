"use client"

import { useState, useEffect } from 'react'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Users } from "lucide-react"
import { generatePopulationData } from "@/lib/simulation-engine"

// Add "You" point (This could also be dynamic if we had patient data)
const userData = [{ x: 65, y: 75, z: 500, type: 'you' }]

export default function PopulationBenchmarking() {
    const [data, setData] = useState<any[]>([])

    useEffect(() => {
        setData(generatePopulationData(40))
    }, [])

    return (
        <section className="glass-panel rounded-xl flex flex-col overflow-hidden h-full">
            <div className="p-3 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-display text-xs tracking-widest text-white uppercase">Population Benchmarking</h3>
                <Users className="text-gray-500 w-4 h-4" />
            </div>

            <div className="flex-1 relative bg-black/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Age"
                            unit="yrs"
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fontSize: 9, fill: '#666' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Severity"
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fontSize: 9, fill: '#666' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'black', borderColor: '#333' }} />
                        <Scatter name="Population" data={data} fill="#666" fillOpacity={0.6}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#666" />
                            ))}
                        </Scatter>
                        <Scatter name="You" data={userData} fill="#00f0ff">
                            {userData.map((entry, index) => (
                                <Cell key={`cell-user-${index}`} className="animate-pulse" fill="#00f0ff" stroke="#fff" strokeWidth={1} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>

                <div className="absolute top-[25%] left-[65%] pointer-events-none">
                    <span className="bg-black/80 px-1 rounded text-[9px] text-accent-cyan border border-accent-cyan/30 ml-2">You</span>
                </div>
            </div>

            <div className="p-2 text-[10px] text-gray-400 text-center border-t border-white/5">
                98th Percentile for Severity
            </div>
        </section>
    )
}
