"use client"

"use client"

import { useEffect, useState } from "react"
import { Activity, Database, Dna, FileText, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getNodeStatus, type NodeStatus } from "@/lib/api"

interface UINode extends NodeStatus {
    icon: any;
    color: string;
    iconColor: string;
    latency?: string;
    queue?: number;
    progress?: number;
    uptime?: string;
    active: boolean;
}

export default function FederatedNodesPanel() {
    const [nodes, setNodes] = useState<UINode[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 5000) // Poll every 5s
        return () => clearInterval(interval)
    }, [])

    const fetchStatus = async () => {
        try {
            const data = await getNodeStatus()

            // Map API data to UI format
            const mappedNodes: UINode[] = data.nodes.map(node => {
                let icon = Database;
                let color = "text-gray-400";

                if (node.name === "Imaging") {
                    icon = Activity;
                    color = "text-primary";
                } else if (node.name === "Clinical") {
                    icon = FileText;
                    color = "text-accent-magenta";
                } else if (node.name === "Pathology") {
                    icon = Database;
                    color = "text-accent-cyan";
                } else if (node.name === "Genomics") {
                    icon = Dna;
                    color = "text-green-400";
                }

                return {
                    ...node,
                    icon,
                    color,
                    iconColor: color.replace("text-", ""),
                    active: node.status === "healthy",
                    // Mock additional metrics if active, since API only gives basic status
                    latency: node.status === "healthy" ? `${Math.floor(Math.random() * 20) + 10}ms` : undefined,
                    uptime: node.status === "healthy" ? "99.9%" : undefined
                }
            })

            setNodes(mappedNodes)
            setError(null)
        } catch (err) {
            console.error("Failed to fetch node status:", err)
            setError("Failed to connect to backend")
            // Fallback to offline state for all known nodes
            setNodes([
                { name: "Imaging Node", url: "", status: "unreachable", is_training: false, active: false, icon: Activity, color: "text-gray-500", iconColor: "gray-500" },
                { name: "Clinical Reports", url: "", status: "unreachable", is_training: false, active: false, icon: FileText, color: "text-gray-500", iconColor: "gray-500" },
                { name: "Pathology", url: "", status: "unreachable", is_training: false, active: false, icon: Database, color: "text-gray-500", iconColor: "gray-500" },
            ] as UINode[])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <aside className="glass-panel rounded-xl flex flex-col overflow-hidden h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-display text-sm tracking-widest text-accent-cyan uppercase flex items-center gap-2">
                    {/* Hub Icon */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M5 5l4 4" />
                        <path d="M19 5l-4 4" />
                        <path d="M5 19l4-4" />
                        <path d="M19 19l-4-4" />
                    </svg>
                    Federated Nodes
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${error ? 'bg-red-500/20 text-red-400 border-red-500/20' : 'bg-primary/20 text-primary border-primary/20'}`}>
                    {error ? 'OFFLINE' : 'LIVE'}
                </span>
            </div>

            {/* Nodes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence mode="popLayout">
                    {isLoading && nodes.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-gray-500 text-center text-xs py-4"
                        >
                            Connecting to mesh...
                        </motion.div>
                    ) : (
                        nodes.map((node, idx) => (
                            <motion.div
                                key={`${node.name}-${idx}`}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: idx * 0.1 }}
                                className={`p-3 rounded-lg bg-black/40 border border-white/5 transition-colors group ${!node.active ? 'opacity-50' : 'hover:border-primary/50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <node.icon className={`w-5 h-5 ${node.color}`} />
                                        <span className="font-bold text-sm">{node.name}</span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${node.active ? 'bg-success shadow-neon-cyan' : 'bg-red-500'}`} />
                                </div>

                                <div className="flex justify-between text-xs text-gray-400 font-mono mb-2">
                                    <span>Status: <span className={node.active ? "text-white" : "text-red-400"}>{node.status}</span></span>
                                    {node.latency && <span>Lat: {node.latency}</span>}
                                    {node.uptime && <span>Up: {node.uptime}</span>}
                                </div>

                                {/* Training Indicator */}
                                {node.is_training && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="flex items-center gap-2 text-[10px] text-accent-magenta"
                                    >
                                        <Activity className="w-3 h-3 animate-pulse" />
                                        <span>Training in progress...</span>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Footer CTA */}
            <div className="p-4 border-t border-white/5 bg-black/20 mt-auto">
                <button className="w-full py-2 text-xs font-display uppercase tracking-wider border border-primary text-primary hover:bg-primary hover:text-white transition-all rounded disabled:opacity-50" disabled={!!error}>
                    Initialize New Node
                </button>
            </div>
        </aside>
    )
}
