"use client"

import { useState, useCallback } from "react"
import { PatientReport, defaultPatientReport } from "@/lib/patient-encoder"
import { ScanLine, Stethoscope, FlaskConical, Play, RotateCcw, Loader2 } from "lucide-react"

interface PatientInputFormProps {
    onPredict: (report: PatientReport) => Promise<void>
    isLoading: boolean
}

type Tab = "imaging" | "clinical" | "pathology"

function Slider({
    label, value, min, max, step = 1, unit = "", onChange
}: {
    label: string; value: number; min: number; max: number
    step?: number; unit?: string; onChange: (v: number) => void
}) {
    const pct = ((value - min) / (max - min)) * 100
    return (
        <div className="group space-y-1">
            <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">{label}</span>
                <span className="text-accent-cyan">{typeof value === "number" && step < 1 ? value.toFixed(1) : value}{unit}</span>
            </div>
            <div className="relative">
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-[#00f0ff] bg-white/10"
                />
                <div
                    className="absolute top-0 left-0 h-1 rounded-l-lg bg-accent-cyan/30 pointer-events-none"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex justify-between text-[9px] text-gray-700 font-mono">
                <span>{min}{unit}</span><span>{max}{unit}</span>
            </div>
        </div>
    )
}

function Toggle({ label, value, onChange, description }: {
    label: string; value: boolean; onChange: (v: boolean) => void; description?: string
}) {
    return (
        <div className="flex items-center justify-between py-1">
            <div>
                <p className="text-xs font-mono text-gray-300">{label}</p>
                {description && <p className="text-[9px] text-gray-600">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`relative w-10 h-5 rounded-full border transition-all duration-300 flex-shrink-0 ${value ? "bg-accent-cyan/20 border-accent-cyan" : "bg-white/5 border-white/20"
                    }`}
            >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${value ? "right-0.5 bg-accent-cyan" : "left-0.5 bg-gray-500"
                    }`} />
            </button>
        </div>
    )
}

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "imaging", label: "Imaging", icon: <ScanLine className="w-3.5 h-3.5" />, color: "text-accent-cyan border-accent-cyan" },
    { id: "clinical", label: "Clinical", icon: <Stethoscope className="w-3.5 h-3.5" />, color: "text-primary border-primary" },
    { id: "pathology", label: "Pathology", icon: <FlaskConical className="w-3.5 h-3.5" />, color: "text-warning border-warning" },
]

export default function PatientInputForm({ onPredict, isLoading }: PatientInputFormProps) {
    const [tab, setTab] = useState<Tab>("imaging")
    const [report, setReport] = useState<PatientReport>(defaultPatientReport())

    const set = useCallback(<K extends keyof PatientReport>(key: K, val: PatientReport[K]) => {
        setReport(prev => ({ ...prev, [key]: val }))
    }, [])

    const reset = () => setReport(defaultPatientReport())

    const activeColor = TAB_CONFIG.find(t => t.id === tab)!.color

    return (
        <div className="glass-panel rounded-xl flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="font-display text-sm tracking-widest text-white uppercase">Patient Report</h2>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Enter clinical data to generate prediction</p>
                </div>
                <button onClick={reset} className="text-gray-600 hover:text-white transition-colors p-1" title="Reset all">
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0">
                {TAB_CONFIG.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-display tracking-wider uppercase border-b-2 transition-all ${tab === t.id
                                ? `${t.color} bg-white/5`
                                : "text-gray-600 border-transparent hover:text-gray-400"
                            }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Form Fields — scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">

                {tab === "imaging" && <>
                    <Slider label="Lesion Count" value={report.lesion_count} min={0} max={20} onChange={v => set("lesion_count", v)} />
                    <Slider label="Max Lesion Size" value={report.max_lesion_size_mm} min={0} max={80} unit="mm" onChange={v => set("max_lesion_size_mm", v)} />
                    <Slider label="Adhesion Score (rASRM)" value={report.adhesion_score} min={0} max={4} step={0.5} onChange={v => set("adhesion_score", v)} />
                    <Slider label="Endometrial Thickness" value={report.endometrial_thickness_mm} min={2} max={20} unit="mm" onChange={v => set("endometrial_thickness_mm", v)} />
                    <Slider label="Doppler Flow Index" value={report.doppler_flow_index} min={0} max={1} step={0.01} onChange={v => set("doppler_flow_index", v)} />
                    <Slider label="Myometrial Involvement" value={report.myometrial_involvement} min={0} max={1} step={0.05} onChange={v => set("myometrial_involvement", v)} />
                    <div className="border-t border-white/5 pt-3 space-y-2">
                        <Toggle label="Ovarian Cyst (Endometrioma)" value={report.ovarian_cyst} onChange={v => set("ovarian_cyst", v)} description="Chocolate cyst on imaging" />
                        <Toggle label="Uterine Cavity Distortion" value={report.uterine_distortion} onChange={v => set("uterine_distortion", v)} />
                    </div>
                </>}

                {tab === "clinical" && <>
                    <Slider label="Age" value={report.age} min={15} max={65} unit="yr" onChange={v => set("age", v)} />
                    <Slider label="BMI" value={report.bmi} min={14} max={45} step={0.5} unit=" kg/m²" onChange={v => set("bmi", v)} />
                    <Slider label="Pain VAS Score" value={report.pain_vas} min={0} max={10} step={0.5} onChange={v => set("pain_vas", v)} />
                    <Slider label="Dysmenorrhea Severity" value={report.dysmenorrhea_severity} min={0} max={3} step={0.5} onChange={v => set("dysmenorrhea_severity", v)} />
                    <Slider label="CA-125" value={report.ca125_u_ml} min={0} max={500} unit=" U/mL" onChange={v => set("ca125_u_ml", v)} />
                    <Slider label="AMH" value={report.amh_ng_ml} min={0} max={10} step={0.1} unit=" ng/mL" onChange={v => set("amh_ng_ml", v)} />
                    <Slider label="Cycle Length" value={report.cycle_length_days} min={21} max={42} unit="d" onChange={v => set("cycle_length_days", v)} />
                    <Slider label="Symptom Duration" value={report.symptom_duration_months} min={0} max={120} unit="mo" onChange={v => set("symptom_duration_months", v)} />
                    <div className="border-t border-white/5 pt-3 space-y-2">
                        <Toggle label="Dyspareunia" value={report.dyspareunia} onChange={v => set("dyspareunia", v)} description="Pain during intercourse" />
                        <Toggle label="Infertility" value={report.infertility} onChange={v => set("infertility", v)} description="Inability to conceive ≥ 12 months" />
                    </div>
                </>}

                {tab === "pathology" && <>
                    <Slider label="CRP" value={report.crp_mg_l} min={0} max={150} step={0.5} unit=" mg/L" onChange={v => set("crp_mg_l", v)} />
                    <Slider label="IL-6" value={report.il6_pg_ml} min={0} max={100} step={0.5} unit=" pg/mL" onChange={v => set("il6_pg_ml", v)} />
                    <Slider label="Neutrophil Count" value={report.neutrophil_count} min={1500} max={8000} unit=" /µL" onChange={v => set("neutrophil_count", v)} />
                    <Slider label="Lymphocyte Ratio" value={report.lymphocyte_ratio} min={0} max={1} step={0.01} onChange={v => set("lymphocyte_ratio", v)} />
                    <Slider label="Biopsy Endo Score" value={report.biopsy_endo_score} min={0} max={4} step={0.5} onChange={v => set("biopsy_endo_score", v)} />
                    <Slider label="Estradiol" value={report.estradiol_pg_ml} min={0} max={800} unit=" pg/mL" onChange={v => set("estradiol_pg_ml", v)} />
                    <Slider label="Progesterone" value={report.progesterone_ng_ml} min={0} max={30} step={0.5} unit=" ng/mL" onChange={v => set("progesterone_ng_ml", v)} />
                    <Slider label="Fibrinogen" value={report.fibrinogen_mg_dl} min={100} max={600} unit=" mg/dL" onChange={v => set("fibrinogen_mg_dl", v)} />
                </>}
            </div>

            {/* Run Prediction Button */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 bg-black/20">
                <button
                    onClick={() => onPredict(report)}
                    disabled={isLoading}
                    className="w-full py-3 flex items-center justify-center gap-2 font-display uppercase text-sm tracking-widest rounded-lg border border-primary bg-primary/20 hover:bg-primary/40 text-white transition-all shadow-neon-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                        <><Play className="w-4 h-4" /> Run Prediction</>
                    )}
                </button>
                <p className="text-[9px] text-gray-700 font-mono text-center mt-2">
                    PINN model · imaging 128d · clinical 64d · pathology 64d
                </p>
            </div>
        </div>
    )
}
