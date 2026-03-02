"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Thermometer, Droplets, Target, ShieldAlert, Cpu, Activity, Layers } from "lucide-react";
import { VtkVolumeViewer } from "./vtk-volume-viewer";
import { GlbViewer } from "./glb-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClinicalDashboardProps {
    predictionData: any;
}

export function ClinicalDashboard({ predictionData }: ClinicalDashboardProps) {

    // Handle parsing fallback safely
    const features = predictionData?.parsed_features || {};

    // VTK 3D Volume parsing
    const vtkVolumeData: number[] | null = predictionData?.vtk_volume || null;
    const volumeDimensions = predictionData?.volume_dimensions || [64, 64, 64];
    const dicomMeta = predictionData?.dicom_metadata || null;
    const isVolumetric = vtkVolumeData !== null && vtkVolumeData.length > 0;

    // Construct Radar Chart Data comparing Patient to Healthy Baseline
    const radarData = [
        {
            metric: "CA-125",
            Patient: Math.min(100, (features.ca125_u_ml || 0) / 5), // normalize for radar (0-100 scale)
            Baseline: 20
        },
        {
            metric: "Pain (VAS)",
            Patient: (features.pain_vas || 0) * 10,
            Baseline: 15
        },
        {
            metric: "Lesion Size",
            Patient: Math.min(100, (features.max_lesion_size_mm || 0) * 2), // up to 50mm = 100
            Baseline: 0
        },
        {
            metric: "CRP",
            Patient: Math.min(100, (features.crp_mg_l || 0)),
            Baseline: 5
        }
    ];

    // Colors based on risk
    const isHighRisk = predictionData?.risk_level === "HIGH" || predictionData?.risk_level === "MODERATE";
    const statusColor = isHighRisk ? "text-red-500" : "text-green-500";
    const bgRiskColor = isHighRisk ? "bg-red-500/10" : "bg-green-500/10";

    return (
        <div className="w-full space-y-6 animate-in fade-in zoom-in duration-500">

            {/* Top Banner */}
            <Card className={`border-l-4 ${isHighRisk ? 'border-l-red-500' : 'border-l-green-500'}`}>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">PINN Analysis Result</span>
                        <div className="flex items-center space-x-2 mt-1">
                            {isHighRisk ? <ShieldAlert className={`h-8 w-8 ${statusColor}`} /> : <Cpu className={`h-8 w-8 ${statusColor}`} />}
                            <span className={`text-3xl font-bold tracking-tight ${statusColor}`}>
                                {predictionData?.risk_level} RISK
                            </span>
                        </div>
                    </div>

                    <div className="flex space-x-8 text-right">
                        <div className="flex items-center space-x-2">
                            <Activity className="h-5 w-5 text-purple-400" />
                            <span className="text-xl font-bold">110 / 70</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Confidence</span>
                            <span className="text-2xl font-bold">{(predictionData?.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Peak Stiffness</span>
                            <span className="text-2xl font-bold">{predictionData?.stiffness.toFixed(2)} kPa</span>
                        </div>
                    </div>
                    {dicomMeta && (
                        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/20 rounded-md">
                            <div className="text-xs text-blue-300 font-mono flex flex-col gap-1">
                                <span>DICOM METADATA EXTRACTED:</span>
                                <span>Modality: {dicomMeta.modality}</span>
                                <span>Slice Thickness: {dicomMeta.slice_thickness}mm</span>
                                <span>Patient ID: {dicomMeta.patient_id}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Panel: 3D Anatomical Map */}
                <Card className="col-span-1 overflow-hidden relative">
                    <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="flex items-center text-lg">
                            <Layers className="mr-2 h-5 w-5 text-primary" />
                            Biomechanical Predictors
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 bg-black/5 relative min-h-[400px]">
                        <Tabs defaultValue="mesh" className="w-full h-full flex flex-col absolute inset-0">
                            <div className="absolute top-4 right-4 z-20">
                                <TabsList className="bg-black/80 backdrop-blur-md border border-white/10 shadow-lg">
                                    <TabsTrigger value="mesh" className="text-xs data-[state=active]:bg-primary">Surface Anatomy</TabsTrigger>
                                    <TabsTrigger value="volume" className="text-xs data-[state=active]:bg-primary">Tissue Volume</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="mesh" className="m-0 border-none p-0 flex-1 h-full w-full data-[state=inactive]:hidden block">
                                <GlbViewer
                                    showLesion={predictionData?.stiffness > 3.0}
                                    stiffness={predictionData?.stiffness}
                                    patientFeatures={features}
                                />
                                {/* Legend Overlaid on GlbViewer */}
                                <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs shadow-sm text-slate-300">
                                    <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-green-500/80 mr-2" /> Healthy (&lt; 2 kPa)</div>
                                    <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-yellow-500/80 mr-2" /> Fibrotic (2-5 kPa)</div>
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500/80 mr-2" /> Endometrioma (&gt; 5 kPa)</div>
                                </div>
                            </TabsContent>

                            <TabsContent value="volume" className="m-0 border-none p-0 flex-1 h-full w-full data-[state=inactive]:hidden block bg-black">
                                {isVolumetric ? (
                                    <div className="w-full h-full relative">
                                        <VtkVolumeViewer
                                            volumeData={vtkVolumeData}
                                            dimensions={volumeDimensions as [number, number, number]}
                                            stiffness={predictionData?.stiffness}
                                        />
                                        <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs shadow-sm text-slate-300">
                                            <div className="flex justify-between w-32 items-center">
                                                <span>Soft</span>
                                                <div className="h-2 w-16 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-full mx-2" />
                                                <span>Stiff</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm font-mono">
                                        Volumetric tensor data unavailable.
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Right Panel: Data Correlation Dashboard */}
                <div className="col-span-1 space-y-6 flex flex-col">

                    {/* Radar Chart */}
                    <Card className="flex-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center">
                                <Activity className="mr-2 h-4 w-4" />
                                Patient Biomarkers vs. Baseline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="currentColor" className="opacity-20" />
                                    <PolarAngleAxis dataKey="metric" className="text-xs" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                                    <Radar name="Healthy Baseline" dataKey="Baseline" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                    <Radar name="Patient" dataKey="Patient" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Extracted Data Summary */}
                    <Card className="flex-1 overflow-auto max-h-[220px]">
                        <CardHeader className="pb-2 sticky top-0 bg-background z-10">
                            <CardTitle className="text-base font-medium">Extracted Report Parameters</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {Object.entries(features)
                                    .filter(([k, v]) => v !== 0 && v !== false)
                                    .slice(0, 12)
                                    .map(([key, value]) => (
                                        <div key={key} className="flex justify-between border-b pb-1">
                                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                                            <span className="font-semibold">{String(value)}</span>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            <div className="flex justify-end">
                <button className="text-sm text-muted-foreground hover:text-foreground italic underline underline-offset-4">
                    Upload Another Document
                </button>
            </div>

        </div>
    );
}
