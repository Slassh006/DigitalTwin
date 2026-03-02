"use client"

import { useState } from "react"
import Header from "@/components/header-new"
import { PatientInputForm } from "@/components/patient-input-form"
import { ClinicalDashboard } from "@/components/visualization/clinical-dashboard"
import { AnimatePresence, motion } from "framer-motion"

export default function SimulationPage() {
    const [predictionData, setPredictionData] = useState<any>(null)

    return (
        <div className="flex flex-col min-h-screen bg-background-dark text-white font-body">
            <Header />
            <main className="flex-1 container mx-auto p-4 flex flex-col items-center justify-center pt-16">
                <AnimatePresence mode="wait">
                    {!predictionData ? (
                        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-4xl">
                            <PatientInputForm onAnalysisComplete={(data) => setPredictionData(data)} />
                        </motion.div>
                    ) : (
                        <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl">
                            <ClinicalDashboard predictionData={predictionData} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}

