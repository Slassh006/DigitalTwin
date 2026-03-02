"use client";

import React, { useEffect, useRef, useState } from "react";

// VTK is very heavy, we import it dynamically only on the client inside useEffect
// since it relies on window and WebGL.
let vtkGenericRenderWindow: any;
let vtkVolume: any;
let vtkVolumeMapper: any;
let vtkImageData: any;
let vtkDataArray: any;
let vtkColorTransferFunction: any;
let vtkPiecewiseFunction: any;

export interface VtkVolumeViewerProps {
    volumeData: number[]; // Flattened volume array
    dimensions: [number, number, number]; // [Z, Y, X] or [X, Y, Z]
    stiffness: number;
}

export function VtkVolumeViewer({ volumeData, dimensions, stiffness }: VtkVolumeViewerProps) {
    const vtkContainerRef = useRef<HTMLDivElement>(null);
    const contextRef = useRef<any>(null);

    // Threshold state to simulate "Tissue Threshold" slider
    const [minThreshold, setMinThreshold] = useState<number>(0);
    const [maxThreshold, setMaxThreshold] = useState<number>(15);

    // Load VTK dynamically
    useEffect(() => {
        let isMounted = true;

        const loadVtk = async () => {
            if (!vtkGenericRenderWindow) {
                // Dynamically import VTK.js modules
                const genericVtk = await import("@kitware/vtk.js/Rendering/Misc/GenericRenderWindow");
                const vtkVol = await import("@kitware/vtk.js/Rendering/Core/Volume");
                const vtkVolMapper = await import("@kitware/vtk.js/Rendering/Core/VolumeMapper");
                const vImageData = await import("@kitware/vtk.js/Common/DataModel/ImageData");
                const vDataArray = await import("@kitware/vtk.js/Common/Core/DataArray");
                const vColorTrans = await import("@kitware/vtk.js/Rendering/Core/ColorTransferFunction");
                const vPiecewise = await import("@kitware/vtk.js/Common/DataModel/PiecewiseFunction");

                // VTK WebGL profile is REQUIRED before creating windows
                await import("@kitware/vtk.js/Rendering/Profiles/Volume");

                vtkGenericRenderWindow = genericVtk.default;
                vtkVolume = vtkVol.default;
                vtkVolumeMapper = vtkVolMapper.default;
                vtkImageData = vImageData.default;
                vtkDataArray = vDataArray.default;
                vtkColorTransferFunction = vColorTrans.default;
                vtkPiecewiseFunction = vPiecewise.default;
            }

            if (isMounted && vtkContainerRef.current) {
                initVtk();
            }
        };

        loadVtk();

        return () => {
            isMounted = false;
        };
    }, []);

    // Initialize or Update VTK Scene
    const initVtk = () => {
        if (!vtkContainerRef.current || !volumeData || volumeData.length === 0) return;

        // Clean up previous context if it exists
        if (contextRef.current) {
            contextRef.current.genericRenderWindow.delete();
            contextRef.current = null;
            vtkContainerRef.current.innerHTML = "";
        }

        // Setup Render Window
        const genericRenderWindow = vtkGenericRenderWindow.newInstance({
            background: [0.03, 0.03, 0.05], // Dark space for medical imaging
        });

        genericRenderWindow.setContainer(vtkContainerRef.current);
        const renderer = genericRenderWindow.getRenderer();
        const renderWindow = genericRenderWindow.getRenderWindow();

        genericRenderWindow.resize();

        // Prepare Image Data representing the Stiffness Volume
        const imageData = vtkImageData.newInstance();
        imageData.setDimensions(dimensions[0], dimensions[1], dimensions[2]);
        imageData.setSpacing([1.0, 1.0, 1.0]);
        imageData.setOrigin([-dimensions[0] / 2, -dimensions[1] / 2, -dimensions[2] / 2]);

        const dataArray = vtkDataArray.newInstance({
            name: "Stiffness",
            values: new Float32Array(volumeData),
            numberOfComponents: 1,
        });

        imageData.getPointData().setScalars(dataArray);

        // Map data to colors and opacities
        const mapper = vtkVolumeMapper.newInstance();
        mapper.setInputData(imageData);

        const volume = vtkVolume.newInstance();
        volume.setMapper(mapper);

        // ── Hardware Accelerated Tissue Thresholding & Transfer Function ──
        // Transfer function maps stiffness to color:
        // Healthy (Base 1.5) = Translucent White
        // Lesion (> 5.0) = Opaque Red

        const ctfun = vtkColorTransferFunction.newInstance();
        ctfun.addRGBPoint(0.0, 0.1, 0.1, 0.1);
        ctfun.addRGBPoint(1.5, 0.3, 0.3, 0.6); // Healthy = soft blueish-white
        ctfun.addRGBPoint(5.0, 0.8, 0.2, 0.2); // Mid-stiff
        ctfun.addRGBPoint(15.0, 1.0, 0.0, 0.0); // Severe Lesion = intense Red

        const ofun = vtkPiecewiseFunction.newInstance();
        // The opacity mapping hides tissues outside our Threshold Slider
        ofun.addPoint(0.0, 0.0);
        ofun.addPoint(minThreshold - 0.1, 0.0);
        ofun.addPoint(minThreshold, 0.05); // Base visibility
        ofun.addPoint(8.0, 0.8); // High stiffness is very visible
        ofun.addPoint(maxThreshold, 0.9);
        ofun.addPoint(maxThreshold + 0.1, 0.0); // Hide anything above max

        volume.getProperty().setRGBTransferFunction(0, ctfun);
        volume.getProperty().setScalarOpacity(0, ofun);
        volume.getProperty().setInterpolationTypeToLinear();
        volume.getProperty().setAmbient(0.2);
        volume.getProperty().setDiffuse(0.7);
        volume.getProperty().setSpecular(0.3);
        volume.getProperty().setSpecularPower(8.0);

        renderer.addVolume(volume);

        // Auto-orbit / Camera setup
        renderer.resetCamera();
        const camera = renderer.getActiveCamera();
        camera.zoom(1.5);
        camera.elevation(20);
        camera.azimuth(30);

        renderWindow.render();

        // Store context for destruction and updates
        contextRef.current = { genericRenderWindow, renderWindow, ofun };
    };

    // Re-render when data or thresholds change
    useEffect(() => {
        if (vtkContainerRef.current && vtkGenericRenderWindow) {
            initVtk();
        }
    }, [volumeData, minThreshold, maxThreshold]);

    return (
        <div className="w-full h-full flex flex-col relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
            {/* 3D VTK Viewport */}
            <div ref={vtkContainerRef} className="absolute inset-0 z-0" style={{ width: "100%", height: "100%" }} />

            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white tracking-widest">VTK.JS VOLUME RENDERER</span>
                </div>
            </div>

            {/* Threshold Floating Controls */}
            <div className="absolute right-4 bottom-4 z-10 p-4 w-64 bg-black/60 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl">
                <h4 className="text-xs font-bold text-slate-300 mb-3 tracking-widest uppercase flex items-center justify-between">
                    <span>Tissue Threshold</span>
                    <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px]">&gt; {minThreshold} kPa</span>
                </h4>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Filter Soft Tissue</span>
                            <span>{minThreshold} kPa</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="15" step="0.5"
                            value={minThreshold}
                            onChange={(e) => setMinThreshold(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-3 flex justify-between">
                    <span>Healthy: &lt; 2 kPa</span>
                    <span className="text-red-400/80">Lesions: &gt; 5 kPa</span>
                </p>
            </div>
        </div>
    );
}
