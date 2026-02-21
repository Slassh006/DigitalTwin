import { useMemo } from "react";
import * as THREE from "three";

export interface MeshCoordinates {
    /** Flattened vertex positions in LOCAL mesh space: [x0,y0,z0, x1,y1,z1, ...] */
    vertices: Float32Array | null;
    /** Index buffer: [i0,i1,i2, i3,i4,i5, ...] — triplets form triangles */
    faces: Uint32Array | null;
    /** Total number of vertices (vertices.length / 3) */
    vertexCount: number;
    /** First Mesh found — used for external raycasting */
    mesh: THREE.Mesh | null;
}

/**
 * useMeshCoordinates
 * Extracts vertices, face indices, and a mesh reference from a loaded THREE.Object3D.
 * Returns coordinates in LOCAL mesh space (no world matrix applied) so they are
 * anatomically stable regardless of the scene transform.
 *
 * Memoized: only re-runs when the `scene` reference changes.
 */
export function useMeshCoordinates(scene: THREE.Object3D | null): MeshCoordinates {
    return useMemo<MeshCoordinates>(() => {
        const empty: MeshCoordinates = {
            vertices: null,
            faces: null,
            vertexCount: 0,
            mesh: null,
        };

        if (!scene) return empty;

        let foundMesh: THREE.Mesh | null = null;
        let foundGeo: THREE.BufferGeometry | null = null;

        scene.traverse((child) => {
            if (!foundMesh && child instanceof THREE.Mesh) {
                foundMesh = child;
                foundGeo = child.geometry;
            }
        });

        if (!foundMesh || !foundGeo) return empty;

        const geo = foundGeo as THREE.BufferGeometry;
        const posAttr = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
        const indexAttr = geo.index;

        if (!posAttr) return empty;

        // Copy vertex data (Float32Array, local space)
        const vertices = new Float32Array(posAttr.array.length);
        vertices.set(posAttr.array as Float32Array);

        // Copy face indices (Uint32Array)
        let faces: Uint32Array | null = null;
        if (indexAttr) {
            faces = new Uint32Array(indexAttr.count);
            for (let i = 0; i < indexAttr.count; i++) {
                faces[i] = indexAttr.getX(i);
            }
        }

        return {
            vertices,
            faces,
            vertexCount: posAttr.count,
            mesh: foundMesh,
        };
    }, [scene]);
}

// ─── Utility: compute Gaussian-weighted stiffness per vertex ─────────────────

interface Hotspot {
    pos: THREE.Vector3;
    /** Relative stiffness multiplier (1.5 = high, 0.3 = low) */
    relStiff: number;
    /** Gaussian blur radius in mesh-local units */
    radius: number;
}

const _vtx = new THREE.Vector3();

/**
 * computePerVertexStiffness
 * Returns a Float32Array of per-vertex stiffness values (kPa).
 * Uses Gaussian-weighted blending of hotspot contributions.
 *
 * @param vertices   Flat vertex array [x0,y0,z0, ...]
 * @param hotspots   Anatomical hotspot definitions
 * @param globalStiffness  Prediction stiffness (kPa) — scales the result
 */
export function computePerVertexStiffness(
    vertices: Float32Array,
    hotspots: Hotspot[],
    globalStiffness: number
): Float32Array {
    const count = vertices.length / 3;
    const result = new Float32Array(count);

    for (let vi = 0; vi < count; vi++) {
        const vx = vertices[vi * 3];
        const vy = vertices[vi * 3 + 1];
        const vz = vertices[vi * 3 + 2];
        _vtx.set(vx, vy, vz);

        let weightedStiff = 0;
        let totalWeight = 0;

        for (const hs of hotspots) {
            const dist = _vtx.distanceTo(hs.pos);
            const sigma = hs.radius;
            const w = Math.exp(-(dist * dist) / (2 * sigma * sigma));
            weightedStiff += w * hs.relStiff;
            totalWeight += w;
        }

        const relStiff = totalWeight > 0 ? weightedStiff / totalWeight : 0.5;
        // Clamp to [0.5, 15] kPa range
        result[vi] = Math.max(0.5, Math.min(15.0, globalStiffness * relStiff));
    }

    return result;
}
