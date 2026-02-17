"use client"

import { Settings2, Loader2, Save, Check } from "lucide-react"
import { useEffect, useState } from "react"
import { getSettings, updateSettings, Settings } from "@/lib/api"

export default function HyperparametersPanel() {
    const [settings, setSettings] = useState<Settings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getSettings()
                setSettings(data)
            } catch (error) {
                console.error("Failed to load settings", error)
            } finally {
                setLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        try {
            await updateSettings(settings)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (error) {
            console.error("Update failed", error)
        } finally {
            setSaving(false)
        }
    }

    if (loading || !settings) {
        return (
            <aside className="glass-panel rounded-xl flex flex-col p-5 h-full items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </aside>
        )
    }

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
                        <span className="text-accent-cyan">{settings.learning_rate}</span>
                    </div>
                    <input
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer range-sm accent-accent-cyan"
                        max="0.01" min="0.0001" step="0.0001" type="range"
                        value={settings.learning_rate}
                        onChange={(e) => setSettings({ ...settings, learning_rate: parseFloat(e.target.value) })}
                    />
                </div>

                {/* Physics Weight Slider */}
                <div className="group">
                    <div className="flex justify-between text-xs font-mono mb-2 text-gray-300">
                        <span>Physics Weight (λ)</span>
                        <span className="text-accent-magenta">{settings.physics_loss_weight}</span>
                    </div>
                    <input
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer range-sm accent-accent-magenta"
                        max="1" min="0" step="0.01" type="range"
                        value={settings.physics_loss_weight}
                        onChange={(e) => setSettings({ ...settings, physics_loss_weight: parseFloat(e.target.value) })}
                    />
                </div>

                {/* Batch Size Selector */}
                <div className="group">
                    <div className="flex justify-between text-xs font-mono mb-2 text-gray-300">
                        <span>Batch Size</span>
                        <span className="text-white">{settings.batch_size}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                        {[32, 64, 128].map((size) => (
                            <button
                                key={size}
                                onClick={() => setSettings({ ...settings, batch_size: size })}
                                className={`flex-1 py-1 border rounded text-xs font-mono transition-colors ${settings.batch_size === size
                                        ? 'border-primary text-primary bg-primary/20 shadow-neon-primary'
                                        : 'border-white/20 hover:bg-white/10 text-gray-400'
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Notifications</span>
                        <div
                            className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${settings.notifications_enabled ? 'bg-primary/50' : 'bg-white/10'}`}
                            onClick={() => setSettings({ ...settings, notifications_enabled: !settings.notifications_enabled })}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${settings.notifications_enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className={`mt-auto w-full py-3 border font-display uppercase text-xs tracking-wider transition-all rounded shadow-neon-primary flex items-center justify-center gap-2 ${saved
                        ? 'bg-green-500/20 border-green-500 text-white'
                        : 'bg-primary/20 hover:bg-primary/40 border-primary text-white'
                    }`}
            >
                {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <Save className="w-4 h-4" />
                )}
                {saving ? "APPLYING..." : saved ? "SAVED!" : "APPLY PARAMETERS"}
            </button>
        </aside>
    )
}
