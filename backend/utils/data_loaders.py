"""Utility functions for data loading and processing."""

import os
import numpy as np
import nibabel as nib
from pathlib import Path
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def load_nifti_file(filepath: str) -> np.ndarray:
    """
    Load a NIfTI (.nii) file and return the 3D volume.
    
    Args:
        filepath: Path to the .nii file
        
    Returns:
        3D numpy array of the MRI volume
    """
    try:
        nifti_img = nib.load(filepath)
        volume = nifti_img.get_fdata()
        logger.info(f"Loaded NIfTI file: {filepath}, shape: {volume.shape}")
        return volume
    except Exception as e:
        logger.error(f"Error loading NIfTI file {filepath}: {e}")
        raise


def normalize_volume(volume: np.ndarray) -> np.ndarray:
    """
    Normalize a 3D volume to [0, 1] range.
    
    Args:
        volume: 3D numpy array
        
    Returns:
        Normalized volume
    """
    min_val = volume.min()
    max_val = volume.max()
    if max_val - min_val > 0:
        return (volume - min_val) / (max_val - min_val)
    return volume


def extract_roi(volume: np.ndarray, center: Tuple[int, int, int], size: int = 64) -> np.ndarray:
    """
    Extract a region of interest (ROI) from a 3D volume.
    
    Args:
        volume: 3D numpy array
        center: (x, y, z) coordinates of the ROI center
        size: Size of the cubic ROI
        
    Returns:
        ROI as a 3D numpy array
    """
    x, y, z = center
    half_size = size // 2
    
    x_start = max(0, x - half_size)
    x_end = min(volume.shape[0], x + half_size)
    y_start = max(0, y - half_size)
    y_end = min(volume.shape[1], y + half_size)
    z_start = max(0, z - half_size)
    z_end = min(volume.shape[2], z + half_size)
    
    roi = volume[x_start:x_end, y_start:y_end, z_start:z_end]
    
    # Pad if necessary
    if roi.shape != (size, size, size):
        padded = np.zeros((size, size, size))
        padded[:roi.shape[0], :roi.shape[1], :roi.shape[2]] = roi
        return padded
    
    return roi


def simulate_3d_convolution(volume: np.ndarray, num_filters: int = 128) -> np.ndarray:
    """
    Simulate 3D convolution feature extraction (for demonstration).
    In production, this would be a trained CNN.
    
    Args:
        volume: 3D input volume
        num_filters: Number of output features
        
    Returns:
        Feature vector
    """
    # Simulate pooling and flattening
    pooled = volume[::2, ::2, ::2]  # Simple downsampling
    flattened = pooled.flatten()
    
    # Simulate dense layer projection
    np.random.seed(42)  # For reproducibility
    weight_matrix = np.random.randn(flattened.shape[0], num_filters) * 0.01
    features = np.dot(flattened, weight_matrix)
    
    # Apply ReLU activation
    features = np.maximum(0, features)
    
    # Normalize
    features = features / (np.linalg.norm(features) + 1e-8)
    
    return features


def load_clinical_data(filepath: str, patient_id: str) -> dict:
    """
    Load clinical data for a specific patient from CSV.
    
    Args:
        filepath: Path to the clinical records CSV
        patient_id: Patient identifier
        
    Returns:
        Dictionary of clinical features
    """
    import pandas as pd
    
    try:
        df = pd.read_csv(filepath)
        patient_data = df[df['patient_id'] == patient_id]
        
        if patient_data.empty:
            logger.warning(f"No data found for patient {patient_id}")
            return None
        
        return patient_data.iloc[0].to_dict()
    except Exception as e:
        logger.error(f"Error loading clinical data: {e}")
        raise


def load_pathology_data(filepath: str, patient_id: str) -> dict:
    """
    Load pathology lab reports for a specific patient from CSV.
    
    Args:
        filepath: Path to the pathology reports CSV
        patient_id: Patient identifier
        
    Returns:
        Dictionary of pathology markers
    """
    import pandas as pd
    
    try:
        df = pd.read_csv(filepath)
        patient_data = df[df['patient_id'] == patient_id]
        
        if patient_data.empty:
            logger.warning(f"No pathology data found for patient {patient_id}")
            return None
        
        return patient_data.iloc[0].to_dict()
    except Exception as e:
        logger.error(f"Error loading pathology data: {e}")
        raise


def get_available_patients(data_dir: str) -> List[str]:
    """
    Get list of available patient IDs from the data directory.
    
    Args:
        data_dir: Path to the data directory
        
    Returns:
        List of patient IDs
    """
    nifti_files = list(Path(data_dir).glob("*.nii"))
    patient_ids = [f.stem.replace("patient_", "") for f in nifti_files]
    return sorted(patient_ids)
