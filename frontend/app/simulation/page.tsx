"use client"

import { useState } from "react";
import { DigitalTwinViewer } from "@/components/three/digital-twin-viewer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { predict } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Activity } from "lucide-react";
import Header from "@/components/header-new";

export default function SimulationPage() {
    const [prediction, setPrediction] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSimulate = async () => {
        setIsLoading(true);

        try {
            const result = await predict();
            setPrediction(result);

            toast({
                title: "Simulation Complete",
                description: `Risk: ${result.risk_level}, Stiffness: ${result.stiffness.toFixed(2)} kPa`,
            });

        } catch (error) {
            toast({
                title: "Simulation Failed",
                description: "Ensure all nodes have been trained first",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case "high":
                return "text-red-500";
            case "moderate":
                return "text-yellow-500";
            case "low":
                return "text-green-500";
            default:
                return "text-gray-500";
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background-dark text-white font-body">
            <Header />
            <div className="flex-1 p-6 space-y-6 overflow-auto">

            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">3D Digital Twin Simulation</h1>
                    <p className="text-muted-foreground mt-1">
                        Physics-Informed Uterus Visualization
                    </p>
                </div>

                <Button
                    onClick={handleSimulate}
                    disabled={isLoading}
                    size="lg"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Simulating...
                        </>
                    ) : (
                        <>
                            <Activity className="mr-2 h-4 w-4" />
                            Simulate
                        </>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
                {/* 3D Viewer */}
                <div className="lg:col-span-3">
                    <Card className="h-full p-6">
                        <DigitalTwinViewer
                            stiffness={prediction?.stiffness || 2.0}
                            meshUrl={prediction?.mesh_url}
                            predictionData={prediction}
                        />
                    </Card>
                </div>

                {/* Results Panel */}
                <div className="space-y-4">
                    <Card className="p-6">
                        <h3 className="font-semibold text-lg mb-4">Prediction Results</h3>

                        {prediction ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Probability</p>
                                    <p className="text-2xl font-bold">{(prediction.prediction * 100).toFixed(1)}%</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground">Tissue Stiffness</p>
                                    <p className="text-2xl font-bold">{prediction.stiffness.toFixed(2)} kPa</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground">Confidence</p>
                                    <p className="text-2xl font-bold">{(prediction.confidence * 100).toFixed(1)}%</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground">Risk Level</p>
                                    <p className={`text-2xl font-bold uppercase ${getRiskColor(prediction.risk_level)}`}>
                                        {prediction.risk_level}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Click "Simulate" to generate a prediction
                            </p>
                        )}
                    </Card>

                    {/* Color Legend */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Stiffness Color Map</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                <span className="text-sm">&lt; 2 kPa (Healthy)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                                <span className="text-sm">2-5 kPa (Moderate)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-500"></div>
                                <span className="text-sm">&gt; 5 kPa (Endometriosis)</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            </div>
        </div>
    );
}
