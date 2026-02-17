"use client"

import { useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { ActivitySquare } from "lucide-react"
import { generateErrorDistribution } from "@/lib/simulation-engine"

export default function PhysicsErrorDist() {
    const [data, setData] = useState<any[]>([])

    useEffect(() => {
        setData(generateErrorDistribution())
    }, [])

    return (
        <section className="glass-panel rounded-xl flex flex-col h-full">
            <div className="p-3 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-display text-xs tracking-widest text-white uppercase">Physics Error Dist.</h3>
                <ActivitySquare className="text-gray-500 w-4 h-4" />
            </div>

            <div className="flex-1 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: 'black', borderColor: '#333', fontSize: '10px' }}
                        />
                        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    fillOpacity={entry.opacity}
                                    stroke={entry.alert ? '#ff0055' : 'none'}
                                    strokeWidth={entry.alert ? 1 : 0}
                                    className="hover:fill-accent-cyan transition-colors duration-300"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="p-2 border-t border-white/5 flex justify-between text-[10px] font-mono text-gray-400">
                <span>0.001</span>
                <span>RESIDUAL</span>
                <span>0.050</span>
            </div>
        </section>
    )
}
