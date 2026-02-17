"use client"

import Header from "@/components/header-new"
import TrainingEvolutionPanel from "@/components/training/training-evolution-panel"
import PINNArchitectureViz from "@/components/training/pinn-architecture-viz"
import FederatedWeightsPanel from "@/components/training/federated-weights-panel"
import HyperparametersPanel from "@/components/training/hyperparameters-panel"
import QuantumConsoleLogs from "@/components/training/quantum-console-logs"
import { Terminal } from "lucide-react"

export default function TrainingPage() {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background-dark text-white font-body selection:bg-primary selection:text-white">
            {/* Top Header */}
            <Header />

            {/* Main Content Grid */}
            <main className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 h-full overflow-hidden">

                {/* TOP ROW */}

                {/* LEFT PANEL: Training Evolution (Spans 4 rows height) */}
                <div className="col-span-12 md:col-span-12 lg:col-span-12 row-span-4 h-full min-h-0">
                    <TrainingEvolutionPanel />
                </div>

                {/* MIDDLE SECTION - Architecture & Hyperparameters */}

                {/* CENTER PANEL: Neural Network Viz (Spans 5 rows) */}
                <div className="col-span-12 md:col-span-8 row-span-5 h-full min-h-0">
                    <PINNArchitectureViz />
                </div>

                {/* RIGHT PANEL: Controls (Spans 5 rows, split vertically) */}
                <div className="col-span-12 md:col-span-4 row-span-5 grid grid-rows-2 gap-4 h-full min-h-0">
                    <div className="row-span-1 h-full min-h-0">
                        <FederatedWeightsPanel />
                    </div>
                    <div className="row-span-1 h-full min-h-0">
                        <HyperparametersPanel />
                    </div>
                </div>

                {/* BOTTOM PANEL: Logs (Spans 3 rows) */}
                <div className="col-span-12 row-span-3 glass-panel rounded-xl flex flex-col overflow-hidden border-t-2 border-primary/50 min-h-0">
                    <QuantumConsoleLogs />
                </div>

            </main>
        </div>
    )
}
