"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ReportUploaderProps {
    onAnalysisComplete: (result: any) => void;
}

export function ReportUploader({ onAnalysisComplete }: ReportUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/predict/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.status}`);
            }

            const result = await response.json();
            toast({
                title: "Analysis Complete",
                description: "Patient report successfully processed through PINN.",
            });
            onAnalysisComplete(result);

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message || "Failed to analyze the medical report.",
            });
        } finally {
            setIsUploading(false);
        }
    }, [onAnalysisComplete, toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpeg', '.jpg', '.png']
        },
        maxFiles: 1
    });

    return (
        <Card className="w-full max-w-2xl mx-auto border-2 border-dashed border-primary/20 bg-background/50 backdrop-blur-sm">
            <CardContent className="p-12">
                <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all duration-300 ${isDragActive ? "scale-105 opacity-80" : ""
                        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                >
                    <input {...getInputProps()} />

                    {isUploading ? (
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    ) : isDragActive ? (
                        <UploadCloud className="h-16 w-16 text-primary animate-bounce" />
                    ) : (
                        <FileText className="h-16 w-16 text-muted-foreground" />
                    )}

                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-semibold tracking-tight">
                            {isUploading ? "Analyzing Report..." : "Upload Patient Report"}
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            {isUploading
                                ? "Extracting clinical features and running federated PINN inference."
                                : "Drag & drop a PDF medical report or scanned image here, or click to browse."}
                        </p>
                    </div>

                    {!isUploading && (
                        <Button variant="secondary" className="mt-4">
                            Select File
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
