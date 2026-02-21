"use client"

import { useEffect, useState, useRef } from "react"
import { getLogs, getStats, type LogEntry } from "@/lib/api"
import { Terminal, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const LOG_COLORS: Record<string, string> = {
    INFO: "text-primary",
    TRAIN: "text-accent-cyan",
    SUCCESS: "text-success",
    WARN: "text-warning",
    ERROR: "text-red-500",
    DEBUG: "text-gray-600",
}

export default function QuantumConsoleLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [sysStats, setSysStats] = useState({ nodes: '—', epochs: 0, training: false })
    const [connected, setConnected] = useState(false)
    const logsEndRef = useRef<HTMLDivElement>(null)
    const lastIdRef = useRef<string | undefined>(undefined)

    // ── Real-time log polling (every 2 s, incremental) ──────────────────────
    useEffect(() => {
        // Initial load: fetch last 80 entries
        const loadInitial = async () => {
            try {
                const data = await getLogs(undefined, 80)
                if (data.logs.length > 0) {
                    setLogs(data.logs)
                    lastIdRef.current = data.logs[data.logs.length - 1].id
                } else {
                    // Seed with a "connected" message if server has no logs yet
                    setLogs([{
                        id: "0",
                        timestamp: new Date().toLocaleTimeString(),
                        type: "INFO",
                        message: "Connected to PINN server. Waiting for activity..."
                    }])
                }
                setConnected(true)
            } catch {
                setLogs([{
                    id: "err",
                    timestamp: new Date().toLocaleTimeString(),
                    type: "WARN",
                    message: "Could not connect to log stream. Will retry..."
                }])
            }
        }

        loadInitial()

        // Poll for new entries only
        const poll = setInterval(async () => {
            try {
                const data = await getLogs(lastIdRef.current, 50)
                if (data.count > 0) {
                    setLogs(prev => {
                        const merged = [...prev, ...data.logs].slice(-200) // keep last 200
                        return merged
                    })
                    lastIdRef.current = data.logs[data.logs.length - 1].id
                }
                setConnected(true)
            } catch {
                setConnected(false)
            }
        }, 2000)

        return () => clearInterval(poll)
    }, [])

    // ── System stats (every 8 s) ─────────────────────────────────────────────
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const s = await getStats()
                setSysStats({
                    nodes: s.active_nodes,
                    epochs: s.total_epochs_trained,
                    training: s.is_training
                })
            } catch { }
        }
        fetchStats()
        const iv = setInterval(fetchStats, 8000)
        return () => clearInterval(iv)
    }, [])

    // ── Auto-scroll ──────────────────────────────────────────────────────────
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    const clearLogs = () => {
        setLogs([{
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            type: "INFO",
            message: "Console cleared."
        }])
    }

    return (
        <div className="flex flex-col h-full overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex-none px-4 py-2 bg-black/40 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-display text-xs tracking-widest text-white uppercase">
                        System Logs
                    </span>
                    {/* Live indicator */}
                    <span className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${connected
                        ? 'text-success border-success/30 bg-success/10'
                        : 'text-red-400 border-red-400/30 bg-red-400/10'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-red-400'}`} />
                        {connected ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-[10px] font-mono text-gray-400">
                        <span>
                            Nodes: <span className={sysStats.nodes.startsWith('3') ? 'text-success' : 'text-yellow-400'}>
                                {sysStats.nodes}
                            </span>
                        </span>
                        <span>
                            Epochs: <span className="text-accent-cyan">{sysStats.epochs}</span>
                        </span>
                        {sysStats.training && (
                            <span className="text-accent-magenta animate-pulse">⬤ TRAINING</span>
                        )}
                    </div>
                    <button
                        onClick={clearLogs}
                        className="text-gray-600 hover:text-white transition-colors"
                        title="Clear console"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Log Area */}
            <div className="flex-1 bg-[#080810] font-mono text-xs relative min-h-0">
                <div className="absolute inset-0 p-3 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
                    <AnimatePresence initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded group"
                            >
                                <span className="text-gray-600 shrink-0 w-[72px]">[{log.timestamp}]</span>
                                <span className={`shrink-0 w-14 font-bold ${LOG_COLORS[log.type] ?? 'text-gray-400'}`}>
                                    {log.type}
                                </span>
                                <span className="text-gray-300 break-all leading-relaxed">{log.message}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Command Input */}
            <div className="flex-none p-2 border-t border-white/10 bg-black/60 flex items-center gap-2">
                <span className="text-accent-cyan animate-pulse font-bold pl-2">&gt;</span>
                <input
                    className="bg-transparent border-none text-white w-full focus:ring-0 p-1 text-sm placeholder-gray-700 font-mono focus:outline-none"
                    placeholder="Enter physics constraint command or --help..."
                    type="text"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value === '--help') {
                            setLogs(prev => [...prev, {
                                id: Date.now().toString(),
                                timestamp: new Date().toLocaleTimeString(),
                                type: "INFO",
                                message: "Available: clear | status | epochs | --help"
                            }])
                            e.currentTarget.value = ''
                        } else if (e.key === 'Enter' && e.currentTarget.value === 'clear') {
                            clearLogs()
                            e.currentTarget.value = ''
                        }
                    }}
                />
            </div>
        </div>
    )
}
