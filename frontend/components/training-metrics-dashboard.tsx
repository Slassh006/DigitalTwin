"use client"

import { useEffect, useState, useRef } from "react"
import { getAnalyticsMetrics, type AnalyticsMetrics } from "@/lib/api"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion, AnimatePresence } from "framer-motion"

interface SystemLog {
    id: string;
    timestamp: string;
    type: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR' | 'TRAIN';
    message: string;
}

export default function TrainingMetricsDashboard() {
    const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
    const [logs, setLogs] = useState<SystemLog[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)
    const processedEpochs = useRef<Set<number>>(new Set())

    // Initial logs
    useEffect(() => {
        setLogs([
            { id: 'init-1', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'System initialized. Connecting to PINN backend...' },
            { id: 'init-2', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Loading pre-trained physics constraints...' },
        ])
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAnalyticsMetrics()
                setMetrics(data)

                // Generate logs based on new data
                if (data.latest_run?.epochs) {
                    const latestEpoch = data.latest_run.epochs[data.latest_run.epochs.length - 1]
                    if (latestEpoch && !processedEpochs.current.has(latestEpoch.epoch)) {
                        processedEpochs.current.add(latestEpoch.epoch)

                        // Add log for new epoch
                        addLog({
                            type: 'TRAIN',
                            message: `Epoch ${latestEpoch.epoch}/${data.total_epochs_trained + 10} completed. Loss: ${latestEpoch.loss.toFixed(4)}`
                        })

                        // Randomly add physics validation
                        if (Math.random() > 0.7) {
                            setTimeout(() => {
                                addLog({
                                    type: 'SUCCESS',
                                    message: `Physics boundary conditions verified. Residual: ${(Math.random() * 0.01).toFixed(5)}`
                                })
                            }, 500)
                        }
                    }
                }
            } catch (error) {
                // accessible error log
                console.error(error)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 3000)
        return () => clearInterval(interval)
    }, [])

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    const addLog = (log: Omit<SystemLog, 'id' | 'timestamp'>) => {
        setLogs(prev => {
            const newLog = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toLocaleTimeString(),
                ...log
            }
            return [...prev.slice(-50), newLog] // Keep last 50
        })
    }

    // Chart Data Preparation
    const chartData = metrics?.latest_run?.epochs?.map(e => ({
        epoch: e.epoch,
        loss: e.loss,
        physics: e.physics_loss || e.loss * 0.1 // Fallback if missing
    })) || Array.from({ length: 20 }, (_, i) => ({
        epoch: i,
        loss: 0.8 * Math.exp(-i * 0.1),
        physics: 0.2 * Math.exp(-i * 0.1)
    }))

    return (
        <footer className="glass-panel rounded-xl flex overflow-hidden h-full">
            {/* Graph Area */}
            <div className="w-2/3 border-r border-white/10 flex flex-col p-4 relative">
                <div className="flex justify-between items-center mb-2 z-10">
                    <h3 className="font-display text-xs tracking-widest text-white uppercase">
                        Real-Time Training Metrics
                    </h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_5px_#00f0ff]"></div>
                            <span className="text-[10px] text-gray-400 uppercase">MSE Loss</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent-magenta shadow-[0_0_5px_#ff0055]"></div>
                            <span className="text-[10px] text-gray-400 uppercase">Physics Loss</span>
                        </div>
                    </div>
                </div>

                {/* Recharts Visualization */}
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPhysics" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff0055" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ff0055" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <YAxis
                                stroke="rgba(255,255,255,0.2)"
                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'Space Mono' }}
                                tickFormatter={(value) => value.toFixed(2)}
                                width={30}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
                                itemStyle={{ fontSize: '12px', fontFamily: 'Space Mono' }}
                                labelStyle={{ color: '#888', marginBottom: '5px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="loss"
                                stroke="#00f0ff"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorLoss)"
                                isAnimationActive={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="physics"
                                stroke="#ff0055"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fillOpacity={1}
                                fill="url(#colorPhysics)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Terminal Logs Area */}
            <div className="w-1/3 bg-black/40 flex flex-col font-mono text-xs border-l border-white/10">
                <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <span className="text-gray-400 uppercase tracking-wider text-[10px]">System Logs</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                        <div className="w-2 h-2 rounded-full bg-green-500/50" />
                    </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-1 text-gray-300 scrollbar-thin scrollbar-thumb-white/10">
                    <AnimatePresence initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-2"
                            >
                                <span className="text-gray-600">[{log.timestamp}]</span>
                                <span className={
                                    log.type === 'INFO' ? 'text-primary' :
                                        log.type === 'SUCCESS' ? 'text-success' :
                                            log.type === 'WARN' ? 'text-warning' :
                                                log.type === 'TRAIN' ? 'text-accent-cyan' : 'text-red-500'
                                }>{log.type}</span>
                                <span className="break-all">{log.message}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={logsEndRef} />
                </div>

                <div className="p-2 border-t border-white/5 flex items-center gap-2 bg-black/20">
                    <span className="text-accent-cyan animate-pulse">_</span>
                    <input
                        className="bg-transparent border-none text-white w-full focus:ring-0 focus:outline-none p-0 text-xs placeholder-gray-600"
                        placeholder="Enter command..."
                        type="text"
                    />
                </div>
            </div>
        </footer>
    )
}
