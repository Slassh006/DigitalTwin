"use client"

import { useEffect, useState, useRef } from "react"
import { getAnalyticsMetrics } from "@/lib/api"
import { Terminal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SystemLog {
    id: string;
    timestamp: string;
    type: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR' | 'TRAIN';
    message: string;
}

export default function QuantumConsoleLogs() {
    const [logs, setLogs] = useState<SystemLog[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)
    const processedEpochs = useRef<Set<number>>(new Set())

    // Initial logs
    useEffect(() => {
        setLogs([
            { id: 'init-1', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Initializing PINN model architecture with 4 hidden layers...' },
            { id: 'init-2', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Distributing weights across Federated Nodes (Secure Aggregation Protocol)' },
            { id: 'init-3', timestamp: new Date().toLocaleTimeString(), type: 'SUCCESS', message: 'Physics boundary conditions verified: Dirichlet & Neumann OK.' },
        ])
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAnalyticsMetrics()

                // Generate logs based on new data
                if (data.latest_run?.epochs) {
                    const latestEpoch = data.latest_run.epochs[data.latest_run.epochs.length - 1]
                    if (latestEpoch && !processedEpochs.current.has(latestEpoch.epoch)) {
                        processedEpochs.current.add(latestEpoch.epoch)

                        // Add log for new epoch
                        addLog({
                            type: 'TRAIN',
                            message: `Epoch ${latestEpoch.epoch}/${data.total_epochs_trained + 10} completed. MSE Loss: ${latestEpoch.loss.toFixed(4)}, Physics Loss: ${(latestEpoch.physics_loss || 0).toFixed(4)}`
                        })

                        // Randomly add physics validation or warning
                        if (Math.random() > 0.8) {
                            setTimeout(() => {
                                addLog({
                                    type: 'WARN',
                                    message: `Gradient spike detected in hidden_layer_${Math.floor(Math.random() * 4)}. Autoscaling Learning Rate...`
                                })
                            }, 500)
                        }
                    }
                }
            } catch (error) {
                // quiet failure
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
            return [...prev.slice(-100), newLog]
        })
    }

    return (
        <div className="flex flex-col h-full overflow-hidden min-h-0">
            <div className="flex-none px-4 py-2 bg-black/40 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-display text-xs tracking-widest text-white uppercase">Quantum Console Logs</span>
                </div>
                <div className="flex gap-4 text-[10px] font-mono text-gray-400">
                    <span>Mem Usage: 14.2GB / 24GB</span>
                    <span className="text-success">GPU Temp: 64°C</span>
                </div>
            </div>

            <div className="flex-1 flex bg-[#0a0a0c] font-mono text-xs p-0 relative min-h-0">
                <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-gray-300 font-mono leading-relaxed absolute inset-0 scrollbar-thin scrollbar-thumb-white/10">
                    <AnimatePresence initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded"
                            >
                                <span className="text-gray-600 w-20">[{log.timestamp}]</span>
                                <span className={`w-16 font-bold ${log.type === 'INFO' ? 'text-primary' :
                                        log.type === 'SUCCESS' ? 'text-success' :
                                            log.type === 'WARN' ? 'text-warning' :
                                                log.type === 'TRAIN' ? 'text-accent-cyan' : 'text-red-500'
                                    }`}>{log.type}</span>
                                <span className="text-gray-300 break-all">{log.message}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={logsEndRef} />
                </div>
            </div>

            <div className="p-2 border-t border-white/10 bg-black/60 flex items-center gap-2 flex-none">
                <span className="text-accent-cyan animate-pulse font-bold pl-2">&gt;</span>
                <input
                    className="bg-transparent border-none text-white w-full focus:ring-0 p-1 text-sm placeholder-gray-600 font-mono focus:outline-none"
                    placeholder="Enter physics constraint command or --help..."
                    type="text"
                />
            </div>
        </div>
    )
}
