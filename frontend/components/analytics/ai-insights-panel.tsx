"use client"

import { Brain, AlertTriangle, ArrowRight } from "lucide-react"

export default function AIInsightsPanel() {
    return (
        <aside className="glass-panel rounded-xl flex flex-col p-1 border-l-2 border-l-primary/50 h-full">
            <div className="p-4 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent">
                <h3 className="font-display text-sm tracking-widest text-accent-cyan uppercase flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Insights
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
                {/* High Risk Alert */}
                <div className="bg-black/40 border border-accent-magenta/30 rounded-lg p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1">
                        <AlertTriangle className="text-accent-magenta text-opacity-50 w-8 h-8 -mr-2 -mt-2" />
                    </div>
                    <h4 className="text-accent-magenta text-xs font-bold uppercase mb-2 tracking-wider">High Risk Alert</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        Rapid increase in tissue stiffness (<span>Δ</span> +12%) detected in the uterosacral ligament zone over the last 3 months.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button className="px-2 py-1 bg-accent-magenta/20 hover:bg-accent-magenta/40 text-[10px] text-white border border-accent-magenta/50 rounded transition-colors uppercase">
                            Review MRI
                        </button>
                    </div>
                </div>

                {/* Treatment Efficacy */}
                <div className="bg-black/40 border border-primary/30 rounded-lg p-3">
                    <h4 className="text-primary text-xs font-bold uppercase mb-2 tracking-wider">Treatment Efficacy</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        Projected response to hormonal therapy shows a <span className="text-success font-bold">85% probability</span> of reducing lesion volume by Month 6.
                    </p>
                </div>

                {/* Recommended Actions */}
                <div className="mt-4">
                    <h4 className="text-white text-xs font-display uppercase mb-3 border-b border-white/10 pb-1">Recommended Actions</h4>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-xs text-gray-400 group cursor-pointer hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-1 transition-transform" />
                            Schedule follow-up ultrasound for week 42.
                        </li>
                        <li className="flex items-start gap-2 text-xs text-gray-400 group cursor-pointer hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-1 transition-transform" />
                            Update biomarker panel: CA-125, IL-6.
                        </li>
                        <li className="flex items-start gap-2 text-xs text-gray-400 group cursor-pointer hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-1 transition-transform" />
                            Validate segmentation mask manually.
                        </li>
                    </ul>
                </div>

                {/* Generating Prognosis */}
                <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
                        <span className="text-[10px] uppercase text-primary font-mono">Generating Prognosis...</span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 h-16 overflow-hidden">
                        &gt; analyzing_histology_vector...<br />
                        &gt; cross_referencing_cohort_99...<br />
                        &gt; physics_constraint_check: PASS<br />
                        &gt; optimizing_treatment_path...
                    </div>
                </div>
            </div>
        </aside>
    )
}
