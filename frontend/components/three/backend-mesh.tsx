"use client"

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import hologramVertexShader from "./shaders/hologram.vert.glsl";
import hologramFragmentShader from "./shaders/hologram.frag.glsl";
import { computePerVertexStiffness } from "@/hooks/useMeshCoordinates";

// ── Anatomical hotspot definitions (local mesh space) ────────────────────────
// These match the lesion marker positions in digital-twin-viewer.tsx
const ANATOMY_HOTSPOTS = [
    { pos: new THREE.Vector3(-0.8, 0.6, 0.3), relStiff: 1.50, radius: 0.80 }, // Left Ovary (hotspot)
    { pos: new THREE.Vector3(0.6, 0.3, -0.2), relStiff: 0.85, radius: 0.70 }, // Right Tube Adhesion
    { pos: new THREE.Vector3(0.0, -0.4, 0.5), relStiff: 0.30, radius: 0.65 }, // Cervical Region (low)
];

interface BackendMeshProps {
    stiffness: number;
    meshUrl?: string;
    heatmapEnabled?: boolean;
    /** Called with the local stiffness at pointer hit point (kPa) */
    onHoverStiffness?: (kPa: number | null) => void;
}

// ── Material factory ─────────────────────────────────────────────────────────

function createHologramMaterial(stiffness: number, heatmapEnabled: boolean): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        vertexShader: hologramVertexShader,
        fragmentShader: hologramFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color("#00ffff") },
            uColor2: { value: new THREE.Color("#ff00ff") },
            uOpacity: { value: 0.7 },
            uStiffness: { value: stiffness },
            uHeatmapEnabled: { value: heatmapEnabled ? 1.0 : 0.0 },
            uUseVertexStiffness: { value: 0.0 },  // updated after geometry is ready
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

// ── LoadedMesh (uses real GLB) ───────────────────────────────────────────────

function LoadedMesh({
    meshUrl, stiffness, heatmapEnabled = true, onHoverStiffness,
}: {
    meshUrl: string; stiffness: number; heatmapEnabled?: boolean;
    onHoverStiffness?: (kPa: number | null) => void;
}) {
    const { scene } = useGLTF(meshUrl);

    // Material — created once, uniforms updated reactively
    const material = useMemo(
        () => createHologramMaterial(stiffness, heatmapEnabled),
        // deliberately not tracking stiffness/heatmapEnabled here — updated via effects below
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    // ── Apply material + per-vertex stiffness attribute when scene loads ──────
    useEffect(() => {
        if (!scene) return;

        scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const geo = child.geometry as THREE.BufferGeometry;

            // ── Per-vertex stiffness attribute ──────────────────────────────
            const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
            if (posAttr) {
                const vertices = posAttr.array as Float32Array;
                const perVertexStiffness = computePerVertexStiffness(
                    vertices, ANATOMY_HOTSPOTS, stiffness
                );
                // Upload as GPU attribute (aVertexStiffness in vertex shader)
                const stiffAttr = new THREE.BufferAttribute(perVertexStiffness, 1);
                geo.setAttribute("aVertexStiffness", stiffAttr);
                material.uniforms.uUseVertexStiffness.value = 1.0;
            }

            child.material = material;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, material]);

    // ── Reactively update per-vertex stiffness when value changes ────────────
    useEffect(() => {
        if (!scene) return;
        material.uniforms.uStiffness.value = stiffness;
        material.uniforms.uHeatmapEnabled.value = heatmapEnabled ? 1.0 : 0.0;

        // Re-compute per-vertex attribute with new stiffness
        scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const geo = child.geometry as THREE.BufferGeometry;
            const posAttr = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
            if (!posAttr) return;

            const perVertexStiffness = computePerVertexStiffness(
                posAttr.array as Float32Array, ANATOMY_HOTSPOTS, stiffness
            );
            const existing = geo.getAttribute("aVertexStiffness") as THREE.BufferAttribute | undefined;
            if (existing) {
                (existing.array as Float32Array).set(perVertexStiffness);
                existing.needsUpdate = true;
            } else {
                geo.setAttribute("aVertexStiffness", new THREE.BufferAttribute(perVertexStiffness, 1));
                material.uniforms.uUseVertexStiffness.value = 1.0;
            }
        });
    }, [scene, stiffness, heatmapEnabled, material]);

    // ── Animate uniform time only (no self-rotation — handled by parent group) ─
    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    // ── Pointer handlers for hover tooltip ────────────────────────────────────
    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (!e.face || !e.object) { onHoverStiffness?.(null); return; }

        const geo = (e.object as THREE.Mesh).geometry as THREE.BufferGeometry;
        const stiffAttr = geo.getAttribute("aVertexStiffness") as THREE.BufferAttribute | undefined;
        if (!stiffAttr || !e.face) { onHoverStiffness?.(null); return; }

        // Sample stiffness at the 3 vertices of the hit face and interpolate via barycentric
        const { a, b, c } = e.face;
        const sa = stiffAttr.getX(a);
        const sb = stiffAttr.getX(b);
        const sc = stiffAttr.getX(c);
        // Simple average (barycentric weights approximate)
        const avg = (sa + sb + sc) / 3;
        onHoverStiffness?.(parseFloat(avg.toFixed(2)));
    }, [onHoverStiffness]);

    const handlePointerLeave = useCallback(() => {
        onHoverStiffness?.(null);
    }, [onHoverStiffness]);

    return (
        <primitive
            object={scene}
            scale={1.5}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        />
    );
}

// ── FallbackMesh (capsule when no GLB) ───────────────────────────────────────

function FallbackMesh({
    stiffness, heatmapEnabled = true, onHoverStiffness,
}: {
    stiffness: number; heatmapEnabled?: boolean;
    onHoverStiffness?: (kPa: number | null) => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    const geometry = useMemo(() => {
        const geo = new THREE.CapsuleGeometry(1.0, 2.0, 32, 64);

        // Per-vertex stiffness attribute for fallback capsule
        const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
        const perVertexStiffness = computePerVertexStiffness(
            posAttr.array as Float32Array, ANATOMY_HOTSPOTS, stiffness
        );
        geo.setAttribute("aVertexStiffness", new THREE.BufferAttribute(perVertexStiffness, 1));
        return geo;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const material = useMemo(
        () => {
            const mat = createHologramMaterial(stiffness, heatmapEnabled);
            mat.uniforms.uUseVertexStiffness.value = 1.0;
            return mat;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(() => {
        material.uniforms.uStiffness.value = stiffness;
        material.uniforms.uHeatmapEnabled.value = heatmapEnabled ? 1.0 : 0.0;

        // Re-compute per-vertex stiffness
        const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
        const perVS = computePerVertexStiffness(posAttr.array as Float32Array, ANATOMY_HOTSPOTS, stiffness);
        const attr = geometry.getAttribute("aVertexStiffness") as THREE.BufferAttribute;
        (attr.array as Float32Array).set(perVS);
        attr.needsUpdate = true;
    }, [stiffness, heatmapEnabled, material, geometry]);

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (!e.face) { onHoverStiffness?.(null); return; }
        const attr = geometry.getAttribute("aVertexStiffness") as THREE.BufferAttribute | undefined;
        if (!attr) { onHoverStiffness?.(null); return; }
        const { a, b, c } = e.face;
        const avg = (attr.getX(a) + attr.getX(b) + attr.getX(c)) / 3;
        onHoverStiffness?.(parseFloat(avg.toFixed(2)));
    }, [geometry, onHoverStiffness]);

    const handlePointerLeave = useCallback(() => onHoverStiffness?.(null), [onHoverStiffness]);

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        />
    );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function BackendMesh({ stiffness, meshUrl, heatmapEnabled = true, onHoverStiffness }: BackendMeshProps) {
    if (meshUrl) {
        return (
            <LoadedMesh
                meshUrl={meshUrl}
                stiffness={stiffness}
                heatmapEnabled={heatmapEnabled}
                onHoverStiffness={onHoverStiffness}
            />
        );
    }
    return (
        <FallbackMesh
            stiffness={stiffness}
            heatmapEnabled={heatmapEnabled}
            onHoverStiffness={onHoverStiffness}
        />
    );
}
