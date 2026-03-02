import Header from "@/components/header-new"
import FederatedNodesPanel from "@/components/federated-nodes-panel"
import PredictionEnginePanel from "@/components/prediction-engine-panel"
import TrainingMetricsDashboard from "@/components/training-metrics-dashboard"
import { Activity } from "lucide-react"
import { GlbViewer } from "@/components/visualization/glb-viewer"

export default function Home() {

    return (
        <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden bg-background-dark text-white font-body selection:bg-primary selection:text-white">
            {/* Top Header */}
            <Header />

            {/* Main Content Grid */}
            <main className="flex-1 p-4 grid grid-cols-12 md:grid-rows-12 gap-4 h-auto md:h-full md:overflow-hidden">

                {/* LEFT PANEL: Federated Data Nodes (Spans 8 rows height) */}
                <div className="col-span-12 md:col-span-3 md:row-span-8 min-h-[300px] md:min-h-0">
                    <FederatedNodesPanel />
                </div>

                {/* CENTER PANEL: Default 3D VTK Visualization (Spans 8 rows height) */}
                <div className="col-span-12 md:col-span-6 md:row-span-8 min-h-[400px] md:min-h-0 relative group">
                    <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <Activity className="h-12 w-12 text-primary mb-2 opacity-50" />
                        <p className="text-gray-300 font-mono text-xs tracking-widest uppercase text-center bg-black/50 p-2 rounded">
                            DEFAULT ANATOMY MODEL <br /> Navigate to <span className="text-primary font-bold">Simulation</span> for Patient DICOMs.
                        </p>
                    </div>

                    {/* Default Anatomy Viewer */}
                    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-white/10 relative">
                        <GlbViewer />
                    </div>
                </div>

                {/* RIGHT PANEL: Prediction Metrics (Spans 8 rows height) */}
                <div className="col-span-12 md:col-span-3 md:row-span-8 min-h-[300px] md:min-h-0">
                    <PredictionEnginePanel />
                </div>

                {/* BOTTOM PANEL: Training Dashboard (Spans 4 rows height) */}
                <div className="col-span-12 md:row-span-4 min-h-[250px] md:min-h-0">
                    <TrainingMetricsDashboard />
                </div>

            </main>
        </div>
    )
}
