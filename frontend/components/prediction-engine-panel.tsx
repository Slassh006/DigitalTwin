"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"
import { motion } from "framer-motion"
import { getAnalyticsMetrics, type AnalyticsMetrics } from "@/lib/api"

export default function PredictionEnginePanel() {
    const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAnalyticsMetrics()
                setMetrics(data)
            } catch (error) {
                console.error("Failed to fetch analytics:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 10000)
        return () => clearInterval(interval)
    }, [])

    // Default values if no data
    const accuracy = metrics?.model_metrics?.accuracy || 0
    const loss = metrics?.latest_run?.final_loss || 0
    const risk = accuracy > 0.8 ? "Low Risk" : (accuracy > 0.5 ? "Moderate" : "High Risk") // Proxy logic

    // Node contributions
    const imagingContrib = metrics?.node_performance?.imaging?.contribution || 0
    const clinicalContrib = metrics?.node_performance?.clinical?.contribution || 0
    const pathologyContrib = metrics?.node_performance?.pathology?.contribution || 0

    return (
        <aside className="glass-panel rounded-xl flex flex-col p-5 h-full overflow-hidden">
            <h3 className="font-display text-sm tracking-widest text-accent-magenta uppercase flex items-center gap-2 mb-6">
                <Activity className="w-4 h-4" />
                Prediction Engine
            </h3>

            {/* Radial Gauge Section */}
            <div className="flex flex-col items-center justify-center mb-8 relative">
                {/* Outer Ring */}
                <div className="w-40 h-40 rounded-full border-4 border-white/5 relative flex items-center justify-center">
                    {/* Progress Ring (Simulated with conic gradient) */}
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{
                            background: `conic-gradient(#ff0055 0% ${accuracy * 100}%, transparent ${accuracy * 100}% 100%)`,
                            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 4px))',
                            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 4px))'
                        }}
                    />

                    {/* Inner Content */}
                    <div className="flex flex-col items-center">
                        <motion.span
                            className="text-4xl font-display font-bold text-white drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {isLoading ? "..." : (accuracy || 0.00).toFixed(2)}
                        </motion.span>
                        <span className="text-xs text-accent-magenta font-mono uppercase mt-1">
                            Model Accuracy
                        </span>
                    </div>
                </div>

                {/* Decoration */}
                <motion.div
                    className="absolute -bottom-5 px-3 py-1 bg-accent-magenta/20 border border-accent-magenta text-accent-magenta text-xs font-bold rounded uppercase tracking-wider shadow-neon-magenta"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    {isLoading ? "SYNCING" : "MODEL READY"}
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-sm text-gray-400">Total Epochs</span>
                    <span className="text-sm font-mono text-white">{metrics?.total_epochs_trained || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-sm text-gray-400">Physics Loss</span>
                    <span className="text-sm font-mono text-success">{loss === 0 ? "N/A" : loss.toExponential(2)}</span>
                </div>

                {/* Feature Importance -> Node Contribution */}
                <div className="pt-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest mb-3 block">
                        Node Contribution
                    </span>
                    <div className="space-y-2">
                        {/* Imaging Bar */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-gray-300">Imaging</span>
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary rounded-full shadow-[0_0_5px_#7311d4]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${imagingContrib * 100}%` }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                />
                            </div>
                            <span className="text-primary font-mono">{imagingContrib.toFixed(2)}</span>
                        </div>
                        {/* Clinical Bar */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-gray-300">Clinical</span>
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-accent-cyan rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${clinicalContrib * 100}%` }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                />
                            </div>
                            <span className="text-accent-cyan font-mono">{clinicalContrib.toFixed(2)}</span>
                        </div>
                        {/* Pathology Bar */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-gray-300">Pathology</span>
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-purple-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pathologyContrib * 100}%` }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                />
                            </div>
                            <span className="text-purple-400 font-mono">{pathologyContrib.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
