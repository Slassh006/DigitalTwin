"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, FlaskConical, Stethoscope, UploadCloud } from "lucide-react";
import { PatientDataEncoder, PatientFormData } from "@/lib/patient-encoder";
import { useToast } from "@/components/ui/use-toast";
import { ReportUploader } from "@/components/ui/report-uploader";

interface PatientInputFormProps {
    onAnalysisComplete: (result: any) => void;
}

export function PatientInputForm({ onAnalysisComplete }: PatientInputFormProps) {
    const { toast } = useToast();
    const [isSimulating, setIsSimulating] = useState(false);

    // Tab tracking to handle rendering logic for upload tab vs sim button
    const [activeTab, setActiveTab] = useState("clinical");

    // Initial state based on our PatientFormData interface
    const [formData, setFormData] = useState<PatientFormData>({
        age: 32,
        bmi: 23.5,
        painVas: 6,
        dysmenorrhea: 5,
        cycleLength: 28,
        depressionScore: 12,
        anxietyScore: 10,
        stressScore: 14,
        diagnosticExperience: 4,
        lesionCount: 2,
        maxSizeCm: 3.5,
        endometrialThickness: 12,
        rasrmScore: 2,
        wbcCount: 6.5,
        neutrophilPercent: 65,
        lymphocytePercent: 28,
        ca125: 35.5,
        ca153: 15.2,
        ca199: 20.1,
        glucose: 4.5
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }));
    };

    const handleSimulation = async () => {
        setIsSimulating(true);

        try {
            // 1. Encode the human-readable data into ML arrays via our encoder 
            const payload = PatientDataEncoder.generatePredictionPayload(formData);

            // 2. Send the mathematical tensors to the backend
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/predict`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                // If it fails, we fall back to a purely synthetic local simulation for demo purposes
                console.warn(`Backend prediction failed: ${response.status}. Falling back to synthetic UI demo.`);
                throw new Error("Backend connection failed.");
            }

            const result = await response.json();

            toast({
                title: "PINN Simulation Complete",
                description: "Multimodal fusion successful. Rendering physics matrix...",
            });

            onAnalysisComplete(result);

        } catch (error: any) {
            console.error("Simulation error, using synthetic fallback:", error);

            // SYNTHETIC FALLBACK if backend is not running
            setTimeout(() => {
                toast({
                    title: "Mock Simulation Complete",
                    description: "Using synthetic physics data for UI demonstration.",
                });
                onAnalysisComplete({
                    riskScore: Math.min(0.95, (formData.ca125 / 100) + (formData.painVas / 20)),
                    confidence: 0.88,
                    predictedStage: formData.rasrmScore >= 3 ? "Severe (Stage IV)" : "Moderate (Stage II)",
                    lesions: [
                        { x: 10, y: 15, z: 12, size: formData.maxSizeCm, stiffness: 25.5 },
                        ...(formData.lesionCount > 1 ? [{ x: 20, y: 18, z: 10, size: 1.5, stiffness: 18.2 }] : [])
                    ]
                });
            }, 1500);

        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto border border-primary/20 bg-background/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="border-b border-primary/10 bg-primary/5 pb-4">
                <CardTitle className="text-2xl font-display flex items-center gap-2">
                    <Activity className="h-6 w-6 text-primary" />
                    Patient Telemetry Input
                </CardTitle>
                <CardDescription>
                    Enter multi-modal parameters to run physics-informed predictions.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-8 bg-background-dark/50 p-1 border border-white/5">
                        <TabsTrigger value="clinical" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                            <Stethoscope className="w-4 h-4 mr-2" /> Clinical
                        </TabsTrigger>
                        <TabsTrigger value="imaging" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                            <Activity className="w-4 h-4 mr-2" /> Imaging
                        </TabsTrigger>
                        <TabsTrigger value="pathology" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                            <FlaskConical className="w-4 h-4 mr-2" /> Pathology
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 transition-all">
                            <UploadCloud className="w-4 h-4 mr-2" /> Upload PDF
                        </TabsTrigger>
                    </TabsList>

                    {/* CLINICAL TAB */}
                    <TabsContent value="clinical" className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">Age (Years) [{formData.age}]</label>
                                <input type="range" name="age" min="15" max="65" value={formData.age} onChange={handleChange} className="w-full accent-primary" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">BMI [{formData.bmi}]</label>
                                <input type="range" name="bmi" min="15" max="45" step="0.1" value={formData.bmi} onChange={handleChange} className="w-full accent-primary" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">Pain VAS (0-10) [{formData.painVas}]</label>
                                <input type="range" name="painVas" min="0" max="10" value={formData.painVas} onChange={handleChange} className="w-full accent-primary" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">Dysmenorrhea Severity [{formData.dysmenorrhea}]</label>
                                <input type="range" name="dysmenorrhea" min="0" max="10" value={formData.dysmenorrhea} onChange={handleChange} className="w-full accent-primary" />
                            </div>
                            <div className="col-span-full grid grid-cols-3 gap-4 p-4 border border-white/5 rounded-lg bg-black/20">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">Depression (DASS)</label>
                                    <input type="number" name="depressionScore" value={formData.depressionScore} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">Anxiety (DASS)</label>
                                    <input type="number" name="anxietyScore" value={formData.anxietyScore} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">Stress (DASS)</label>
                                    <input type="number" name="stressScore" value={formData.stressScore} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* IMAGING TAB */}
                    <TabsContent value="imaging" className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">Estimated Lesion Count [{formData.lesionCount}]</label>
                                <input type="range" name="lesionCount" min="0" max="15" value={formData.lesionCount} onChange={handleChange} className="w-full accent-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">Max Lesion Size (cm) [{formData.maxSizeCm}]</label>
                                <input type="range" name="maxSizeCm" min="0.1" max="10" step="0.1" value={formData.maxSizeCm} onChange={handleChange} className="w-full accent-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">Endometrial Thickness (mm) [{formData.endometrialThickness}]</label>
                                <input type="range" name="endometrialThickness" min="2" max="25" step="0.5" value={formData.endometrialThickness} onChange={handleChange} className="w-full accent-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono">rASRM Adhesion Score (1-4) [{formData.rasrmScore}]</label>
                                <input type="range" name="rasrmScore" min="1" max="4" value={formData.rasrmScore} onChange={handleChange} className="w-full accent-blue-500" />
                            </div>
                        </div>
                    </TabsContent>

                    {/* PATHOLOGY TAB */}
                    <TabsContent value="pathology" className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono text-purple-400">CA-125 (kU/L) [{formData.ca125}]</label>
                                <input type="range" name="ca125" min="0" max="150" step="0.5" value={formData.ca125} onChange={handleChange} className="w-full accent-purple-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 font-mono text-purple-400">WBC Count (10^9/L) [{formData.wbcCount}]</label>
                                <input type="range" name="wbcCount" min="3" max="15" step="0.1" value={formData.wbcCount} onChange={handleChange} className="w-full accent-purple-500" />
                            </div>

                            <div className="col-span-full grid grid-cols-4 gap-4 p-4 border border-white/5 rounded-lg bg-black/20 mt-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">CA-153</label>
                                    <input type="number" name="ca153" value={formData.ca153} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">CA-199</label>
                                    <input type="number" name="ca199" value={formData.ca199} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">Neutrophil %</label>
                                    <input type="number" name="neutrophilPercent" value={formData.neutrophilPercent} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 uppercase">Lymphocyte %</label>
                                    <input type="number" name="lymphocytePercent" value={formData.lymphocytePercent} onChange={handleChange} className="w-full bg-background border border-white/10 rounded px-2 py-1 text-sm font-mono" />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* UPLOAD TAB */}
                    <TabsContent value="upload" className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
                        <div className="w-full pt-4">
                            <ReportUploader onAnalysisComplete={onAnalysisComplete} />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <CardFooter className="bg-black/30 border-t border-white/5 py-4 flex justify-between items-center">
                <p className="text-xs text-gray-500 font-mono">
                    <span className="text-emerald-500 font-bold mx-1">●</span> Nodes Ready: Imaging, Clinical, Pathology
                </p>
                {activeTab !== "upload" && (
                    <Button
                        onClick={handleSimulation}
                        disabled={isSimulating}
                        className="bg-primary hover:bg-primary/80 text-white font-bold py-6 px-8 rounded-full shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
                    >
                        {isSimulating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Fusing Multimodal Tensors...
                            </>
                        ) : (
                            "Run PINN Simulation"
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
