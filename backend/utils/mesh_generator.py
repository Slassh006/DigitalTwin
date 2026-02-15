"""3D mesh generation utilities for uterus visualization."""

import numpy as np
import trimesh
from pathlib import Path
from typing import Optional, Tuple
from skimage import measure
import logging

logger = logging.getLogger(__name__)


def generate_uterus_mesh_from_mri(
    volume: np.ndarray,
    threshold: Optional[float] = None,
    output_path: Optional[str] = None
) -> trimesh.Trimesh:
    """
    Generate a 3D mesh from MRI volume using marching cubes algorithm.
    
    Args:
        volume: 3D numpy array of MRI data
        threshold: Isosurface threshold (auto-calculated if None)
        output_path: Optional path to save the mesh (.glb or .obj)
        
    Returns:
        Trimesh object
    """
    # Auto-calculate threshold if not provided (Otsu's method)
    if threshold is None:
        from skimage.filters import threshold_otsu
        threshold = threshold_otsu(volume)
        logger.info(f"Auto-calculated threshold: {threshold}")
    
    # Generate mesh using marching cubes
    try:
        verts, faces, normals, values = measure.marching_cubes(
            volume,
            level=threshold,
            spacing=(1.0, 1.0, 1.0),
            allow_degenerate=False
        )
        
        # Create trimesh object
        mesh = trimesh.Trimesh(
            vertices=verts,
            faces=faces,
            vertex_normals=normals
        )
        
        # Center the mesh
        mesh.vertices -= mesh.center_mass
        
        # Smooth the mesh
        trimesh.smoothing.filter_laplacian(mesh, iterations=3)
        
        logger.info(f"Generated mesh: {len(verts)} vertices, {len(faces)} faces")
        
        # Save if output path provided
        if output_path:
            mesh.export(output_path)
            logger.info(f"Mesh saved to {output_path}")
        
        return mesh
        
    except Exception as e:
        logger.error(f"Error generating mesh: {e}")
        raise


def generate_simplified_uterus_mesh(output_path: Optional[str] = None) -> trimesh.Trimesh:
    """
    Generate a simplified anatomical mesh for demonstration purposes.
    Uses a capsule shape approximating uterus geometry.
    
    Args:
        output_path: Optional path to save the mesh
        
    Returns:
        Trimesh object
    """
    # Create cavity body (main chamber)
    body = trimesh.creation.capsule(height=60, radius=25, sections=32)
    
    # Create cervix (lower neck)
    cervix = trimesh.creation.capsule(height=30, radius=10, sections=16)
    cervix.apply_translation([0, 0, -40])
    
    # Combine meshes
    mesh = trimesh.util.concatenate([body, cervix])
    
    # Smooth the mesh
    trimesh.smoothing.filter_laplacian(mesh, iterations=5)
    
    # Center and scale
    mesh.vertices -= mesh.center_mass
    mesh.vertices *= 0.1  # Scale to reasonable size
    
    logger.info(f"Generated simplified mesh: {len(mesh.vertices)} vertices")
    
    if output_path:
        mesh.export(output_path)
        logger.info(f"Simplified mesh saved to {output_path}")
    
    return mesh


def apply_stiffness_colormap(
    mesh: trimesh.Trimesh,
    stiffness_values: np.ndarray,
    colormap: str = 'RdYlGn_r'
) -> trimesh.Trimesh:
    """
    Apply color mapping to mesh based on stiffness values.
    
    Args:
        mesh: Input trimesh object
        stiffness_values: Stiffness value per vertex (kPa)
        colormap: Matplotlib colormap name
        
    Returns:
        Mesh with vertex colors applied
    """
    from matplotlib import cm
    import matplotlib.pyplot as plt
    
    # Normalize stiffness to [0, 1]
    stiffness_norm = (stiffness_values - stiffness_values.min()) / \
                     (stiffness_values.max() - stiffness_values.min() + 1e-8)
    
    # Get colormap
    cmap = cm.get_cmap(colormap)
    
    # Apply colors
    colors = cmap(stiffness_norm)
    
    # Convert to RGBA uint8
    colors_uint8 = (colors * 255).astype(np.uint8)
    
    mesh.visual.vertex_colors = colors_uint8
    
    return mesh


def generate_stiffness_map(
    num_vertices: int,
    prediction: float,
    base_stiffness: float = 1.5,
    lesion_stiffness: float = 8.0,
    noise_level: float = 0.2
) -> np.ndarray:
    """
    Generate synthetic stiffness values for mesh vertices.
    
    Args:
        num_vertices: Number of vertices in the mesh
        prediction: Endometriosis prediction (0-1)
        base_stiffness: Stiffness of healthy tissue (kPa)
        lesion_stiffness: Stiffness of endometriotic lesions (kPa)
        noise_level: Amount of random variation
        
    Returns:
        Array of stiffness values per vertex
    """
    # Base stiffness
    stiffness = np.ones(num_vertices) * base_stiffness
    
    # Add lesion regions based on prediction
    if prediction > 0.5:
        # Create random lesion centers
        num_lesions = int((prediction - 0.5) * 10) + 1
        lesion_centers = np.random.randint(0, num_vertices, num_lesions)
        
        # Spread lesion stiffness
        for center in lesion_centers:
            # Gaussian influence
            distances = np.abs(np.arange(num_vertices) - center)
            influence = np.exp(-distances / (num_vertices * 0.1))
            stiffness += influence * (lesion_stiffness - base_stiffness) * prediction
    
    # Add noise
    noise = np.random.randn(num_vertices) * noise_level
    stiffness += noise
    
    # Clamp to physical range
    stiffness = np.clip(stiffness, 0.5, 15.0)
    
    return stiffness


def mesh_to_obj_string(mesh: trimesh.Trimesh) -> str:
    """
    Convert trimesh to OBJ format string.
    
    Args:
        mesh: Input trimesh object
        
    Returns:
        OBJ format string
    """
    return trimesh.exchange.obj.export_obj(mesh)


def mesh_to_glb_bytes(mesh: trimesh.Trimesh) -> bytes:
    """
    Convert trimesh to GLB format bytes.
    
    Args:
        mesh: Input trimesh object
        
    Returns:
        GLB format bytes
    """
    return trimesh.exchange.gltf.export_glb(mesh)
