import Header from "@/components/header-new"
import FederatedNodesPanel from "@/components/federated-nodes-panel"
import PredictionEnginePanel from "@/components/prediction-engine-panel"
import TrainingMetricsDashboard from "@/components/training-metrics-dashboard"
// import HolographicViewer from "@/components/three/holographic-viewer-new"
import { DigitalTwinViewer } from "@/components/three/digital-twin-viewer"
// Using the Real 3D Viewer with uterus.glb

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

                {/* CENTER PANEL: 3D Visualization (Spans 8 rows height) */}
                <div className="col-span-12 md:col-span-6 md:row-span-8 min-h-[400px] md:min-h-0 relative group">
                    {/* Passing default stiffness, real interactive model */}
                    <DigitalTwinViewer stiffness={2.4} />
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
