"""Utility modules for the Endometriosis Digital Twin backend."""

from .data_loaders import (
    load_nifti_file,
    normalize_volume,
    extract_roi,
    simulate_3d_convolution,
    load_clinical_data,
    load_pathology_data,
    get_available_patients
)

# Physics loss requires torch - only import in PINN server, not client nodes
# from .physics_loss import (
#     physics_loss,
#     elasticity_regularization,
#     PINNLoss,
#     compute_confidence
# )

from .mesh_generator import (
    generate_uterus_mesh_from_mri,
    generate_simplified_uterus_mesh,
    apply_stiffness_colormap,
    generate_stiffness_map,
    mesh_to_obj_string,
    mesh_to_glb_bytes
)

__all__ = [
    # Data loaders
    'load_nifti_file',
    'normalize_volume',
    'extract_roi',
    'simulate_3d_convolution',
    'load_clinical_data',
    'load_pathology_data',
    'get_available_patients',
    # Mesh generation
    'generate_uterus_mesh_from_mri',
    'generate_simplified_uterus_mesh',
    'apply_stiffness_colormap',
    'generate_stiffness_map',
    'mesh_to_obj_string',
    'mesh_to_glb_bytes',
]
