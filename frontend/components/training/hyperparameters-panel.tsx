"use client"

import { Settings2 } from "lucide-react"

export default function HyperparametersPanel() {
    return (
        <aside className="glass-panel rounded-xl flex flex-col p-5 overflow-y-auto h-full">
            <h3 className="font-display text-sm tracking-widest text-primary uppercase flex items-center gap-2 mb-6">
                <Settings2 className="w-4 h-4" />
                Hyperparameters
            </h3>

            <div className="space-y-6">
                {/* Learning Rate Slider */}
                <div className="group">
                    <div className="flex justify-between text-xs font-mono mb-2 text-gray-300">
                        <span>Learning Rate</span>
                        <span className="text-accent-cyan">1e-4</span>
                    </div>
                    <input
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer range-sm accent-accent-cyan"
                        max="100" min="1" type="range" defaultValue="40"
                    />
                </div>

                {/* Physics Weight Slider */}
                <div className="group">
                    <div className="flex justify-between text-xs font-mono mb-2 text-gray-300">
                        <span>Physics Weight (λ)</span>
                        <span className="text-accent-magenta">0.85</span>
                    </div>
                    <input
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer range-sm accent-accent-magenta"
                        max="100" min="0" type="range" defaultValue="85"
                    />
                </div>

                {/* Batch Size Selector */}
                <div className="group">
                    <div className="flex justify-between text-xs font-mono mb-2 text-gray-300">
                        <span>Batch Size</span>
                        <span className="text-white">64</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                        <button className="flex-1 py-1 border border-white/20 rounded hover:bg-white/10 text-xs font-mono transition-colors text-gray-400">32</button>
                        <button className="flex-1 py-1 border border-primary text-primary bg-primary/20 rounded text-xs font-mono shadow-neon-primary">64</button>
                        <button className="flex-1 py-1 border border-white/20 rounded hover:bg-white/10 text-xs font-mono transition-colors text-gray-400">128</button>
                    </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Adaptive Activation</span>
                        <div className="w-8 h-4 bg-primary/50 rounded-full relative cursor-pointer">
                            <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Gradient Clipping</span>
                        <div className="w-8 h-4 bg-white/10 rounded-full relative cursor-pointer">
                            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-gray-400 rounded-full shadow-sm"></div>
                        </div>
                    </div>
                </div>
            </div>

            <button className="mt-auto w-full py-3 bg-primary/20 hover:bg-primary/40 border border-primary text-white font-display uppercase text-xs tracking-wider transition-all rounded shadow-neon-primary">
                Apply Parameters
            </button>
        </aside>
    )
}
