"use client"

import { useState } from "react"
import Header from "@/components/header-new"
import PatientInputForm from "@/components/patient-input-form"
import { DigitalTwinViewer } from "@/components/three/digital-twin-viewer"
import { predict, type PredictionResponse } from "@/lib/api"
import { encodePatientReport, type PatientReport } from "@/lib/patient-encoder"
import { useToast } from "@/components/ui/use-toast"
import { Activity, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    HIGH: { label: "HIGH RISK", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/40", icon: <AlertTriangle className="w-5 h-5" /> },
    MODERATE: { label: "MODERATE", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/40", icon: <Activity className="w-5 h-5" /> },
    LOW: { label: "LOW RISK", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/40", icon: <CheckCircle className="w-5 h-5" /> },
    MINIMAL: { label: "MINIMAL", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/40", icon: <Info className="w-5 h-5" /> },
}

function ResultMetric({ label, value, unit = "", accent = "accent-cyan" }:
    { label: string; value: string; unit?: string; accent?: string }) {
    return (
        <div className="flex flex-col border border-white/10 rounded-lg p-3 bg-black/20">
            <span className="text-[9px] font-display tracking-widest text-gray-500 uppercase mb-1">{label}</span>
            <span className={`text-xl font-bold font-mono text-${accent}`}>
                {value}<span className="text-xs text-gray-500 ml-1">{unit}</span>
            </span>
        </div>
    )
}

export default function SimulationPage() {
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const handlePredict = async (report: PatientReport) => {
        setIsLoading(true)
        try {
            const encoded = encodePatientReport(report)
            const result = await predict({
                imaging_features: encoded.imaging_features,
                clinical_features: encoded.clinical_features,
                pathology_features: encoded.pathology_features,
            })
            setPrediction(result)
            toast({
                title: "Prediction Complete",
                description: `Risk: ${result.risk_level} · Stiffness: ${result.stiffness.toFixed(2)} kPa`,
            })
        } catch {
            toast({
                title: "Prediction Failed",
                description: "Ensure all nodes are online and the model is trained.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const risk = prediction ? (RISK_CONFIG[prediction.risk_level?.toUpperCase()] ?? RISK_CONFIG.LOW) : null

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background-dark text-white font-body">
            <Header />

            <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">

                {/* ── LEFT: Patient Input Form (3 cols) ── */}
                <div className="col-span-12 lg:col-span-3 h-full overflow-hidden">
                    <PatientInputForm onPredict={handlePredict} isLoading={isLoading} />
                </div>

                {/* ── CENTER: 3D Viewer (6 cols) ── */}
                <div className="col-span-12 lg:col-span-6 h-full relative">
                    <DigitalTwinViewer
                        stiffness={prediction?.stiffness ?? 2.0}
                        predictionData={prediction ?? undefined}
                    />

                    {/* Overlay: no prediction yet */}
                    <AnimatePresence>
                        {!prediction && !isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-end pb-10 pointer-events-none z-10"
                            >
                                <div className="glass-panel rounded-xl px-6 py-3 border border-white/10">
                                    <p className="text-xs text-gray-400 font-mono text-center">
                                        Fill in patient data on the left and click
                                        <span className="text-primary"> Run Prediction</span>
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── RIGHT: Results Panel (3 cols) ── */}
                <div className="col-span-12 lg:col-span-3 h-full overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10">

                    {/* Risk Badge */}
                    <AnimatePresence mode="wait">
                        {risk ? (
                            <motion.div
                                key={prediction?.risk_level}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`glass-panel rounded-xl p-4 border ${risk.border} ${risk.bg} flex items-center gap-3`}
                            >
                                <span className={risk.color}>{risk.icon}</span>
                                <div>
                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-display">Risk Assessment</p>
                                    <p className={`text-lg font-bold font-display ${risk.color}`}>{risk.label}</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                className="glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3 opacity-50"
                            >
                                <Activity className="w-5 h-5 text-gray-600" />
                                <div>
                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-display">Awaiting Prediction</p>
                                    <p className="text-sm font-display text-gray-600">No result yet</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Metrics Grid */}
                    <div className="glass-panel rounded-xl p-4 space-y-3">
                        <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-display">Prediction Metrics</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <ResultMetric
                                label="Probability"
                                value={prediction ? `${(prediction.prediction * 100).toFixed(1)}` : "—"}
                                unit="%"
                                accent="accent-cyan"
                            />
                            <ResultMetric
                                label="Confidence"
                                value={prediction ? `${(prediction.confidence * 100).toFixed(1)}` : "—"}
                                unit="%"
                                accent="primary"
                            />
                            <ResultMetric
                                label="Stiffness"
                                value={prediction ? prediction.stiffness.toFixed(2) : "—"}
                                unit="kPa"
                                accent="accent-magenta"
                            />
                            <ResultMetric
                                label="Timestamp"
                                value={prediction ? new Date(prediction.timestamp).toLocaleTimeString() : "—"}
                                accent="white"
                            />
                        </div>
                    </div>

                    {/* Stiffness Visual Scale */}
                    <div className="glass-panel rounded-xl p-4">
                        <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-display mb-3">Tissue Stiffness Scale</h3>
                        <div className="space-y-2">
                            {[
                                { label: "< 2 kPa", desc: "Healthy Tissue", color: "bg-green-500" },
                                { label: "2–5 kPa", desc: "Moderate Changes", color: "bg-yellow-500" },
                                { label: "> 5 kPa", desc: "Endometriosis", color: "bg-red-500" },
                            ].map(({ label, desc, color }) => (
                                <div key={label} className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
                                    <div>
                                        <span className="text-xs font-mono text-white">{label}</span>
                                        <span className="text-[10px] text-gray-600 ml-2">{desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Live bar */}
                        {prediction && (
                            <div className="mt-4">
                                <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-1">
                                    <span>0</span><span>5 kPa</span><span>10+</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((prediction.stiffness / 10) * 100, 100)}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className={`h-full rounded-full ${prediction.stiffness < 2 ? "bg-green-500" :
                                                prediction.stiffness < 5 ? "bg-yellow-500" : "bg-red-500"
                                            }`}
                                    />
                                </div>
                                <p className="text-center text-[10px] font-mono text-gray-500 mt-1">
                                    {prediction.stiffness.toFixed(2)} kPa
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Clinical Interpretation */}
                    {prediction && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel rounded-xl p-4"
                        >
                            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-display mb-2">Clinical Note</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                {prediction.prediction > 0.6
                                    ? "⚠ Elevated endometriosis probability detected. Recommend further laparoscopic evaluation and specialist consultation."
                                    : prediction.prediction > 0.3
                                        ? "⚡ Moderate indicators present. Monitor symptoms and consider follow-up imaging in 3–6 months."
                                        : "✅ Low probability of endometriosis based on current inputs. Routine monitoring advised."}
                            </p>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    )
}
