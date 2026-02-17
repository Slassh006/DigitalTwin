"use client"

import { motion } from "framer-motion"
import Header from "@/components/header-new"
import LongitudinalTrendAnalysis from "@/components/analytics/longitudinal-trend-analysis"
import AIInsightsPanel from "@/components/analytics/ai-insights-panel"
import BiomarkerSensitivity from "@/components/analytics/biomarker-sensitivity"
import PopulationBenchmarking from "@/components/analytics/population-benchmarking"
import PhysicsErrorDist from "@/components/analytics/physics-error-dist"

export default function AnalyticsPage() {
    return (
        <div className="text-white font-body h-screen flex flex-col overflow-hidden bg-background-dark bg-[url('/grid-pattern.png')]">
            <Header />

            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 h-full overflow-hidden"
            >
                {/* 1. Longitudinal Trend Analysis (Top Left, 9x7) */}
                <div className="col-span-12 lg:col-span-9 row-span-7 h-full min-h-0">
                    <LongitudinalTrendAnalysis />
                </div>

                {/* 2. AI Insights Panel (Right Sidebar, 3x12) */}
                <div className="col-span-12 lg:col-span-3 row-span-12 h-full min-h-0">
                    <AIInsightsPanel />
                </div>

                {/* 3. Biomarker Sensitivity (Bottom Left 1, 3x5) */}
                <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-5 h-full min-h-0">
                    <BiomarkerSensitivity />
                </div>

                {/* 4. Population Benchmarking (Bottom Middle, 3x5) */}
                <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-5 h-full min-h-0">
                    <PopulationBenchmarking />
                </div>

                {/* 5. Physics Error Dist (Bottom Right of Left Block, 3x5) */}
                <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-5 h-full min-h-0">
                    <PhysicsErrorDist />
                </div>
            </motion.main>
        </div>
    )
}
