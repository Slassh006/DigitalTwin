"""
Imaging Node - Federated Learning Client for MRI Data Processing.

This node processes 3D pelvic MRI scans (NIfTI format), extracts features,
and generates 3D meshes for visualization. Raw MRI data never leaves this pod.
"""

import os
import logging
from pathlib import Path
from typing import List, Optional
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.data_loaders import (
    load_nifti_file,
    normalize_volume,
    extract_roi,
    simulate_3d_convolution,
    get_available_patients
)
from utils.mesh_generator import (
    generate_uterus_mesh_from_mri,
    generate_simplified_uterus_mesh,
    apply_stiffness_colormap,
    generate_stiffness_map,
    mesh_to_glb_bytes
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Imaging Node",
    description="Federated learning client for MRI image processing",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
DATA_PATH = os.getenv("DATA_PATH", "/app/data")
current_features: Optional[np.ndarray] = None
training_history: List[dict] = []
is_training: bool = False


# ==================== Pydantic Models ====================

class TrainRequest(BaseModel):
    patient_ids: Optional[List[str]] = None
    epochs: int = 10
    mock_data: bool = True  # Use mock data if real files not found


class TrainResponse(BaseModel):
    status: str
    message: str
    epochs_completed: int
    final_loss: float
    feature_dim: int


class FeaturesResponse(BaseModel):
    features: List[float]
    dim: int
    patient_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    node_type: str
    data_available: bool
    is_training: bool


# ==================== Helper Functions ====================

def load_mri_data(patient_id: str) -> np.ndarray:
    """Load MRI data for a patient."""
    filepath = Path(DATA_PATH) / f"patient_{patient_id}.nii"
    
    if filepath.exists():
        logger.info(f"Loading real MRI data from {filepath}")
        volume = load_nifti_file(str(filepath))
        return normalize_volume(volume)
    else:
        logger.warning(f"MRI file not found: {filepath}. Generating mock data.")
        return generate_mock_mri()


def generate_mock_mri() -> np.ndarray:
    """Generate synthetic MRI-like 3D data for testing."""
    # Create a realistic 3D volume with gaussian blobs
    volume = np.zeros((128, 128, 64))
    
    # Add several gaussian blobs to simulate tissue
    for _ in range(5):
        center_x = np.random.randint(30, 98)
        center_y = np.random.randint(30, 98)
        center_z = np.random.randint(15, 49)
        
        x, y, z = np.mgrid[0:128, 0:128, 0:64]
        gaussian = np.exp(-((x-center_x)**2 + (y-center_y)**2 + (z-center_z)**2) / 500)
        volume += gaussian * np.random.rand()
    
    # Add noise
    volume += np.random.randn(128, 128, 64) * 0.05
    
    return normalize_volume(volume)


def extract_features(volume: np.ndarray, feature_dim: int = 128) -> np.ndarray:
    """Extract features from 3D volume using simulated CNN."""
    # Extract center ROI
    center = (volume.shape[0]//2, volume.shape[1]//2, volume.shape[2]//2)
    roi = extract_roi(volume, center, size=64)
    
    # Simulate 3D convolution
    features = simulate_3d_convolution(roi, num_filters=feature_dim)
    
    return features


def simulate_training_epoch(volume: np.ndarray, epoch: int) -> float:
    """Simulate one training epoch and return loss."""
    # Simulate decreasing loss
    base_loss = 1.0
    noise = np.random.randn() * 0.05
    loss = base_loss * np.exp(-epoch * 0.15) + noise
    return max(loss, 0.01)


# ==================== API Endpoints ====================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Kubernetes."""
    data_path = Path(DATA_PATH)
    data_available = data_path.exists() and any(data_path.glob("*.nii"))
    
    return {
        "status": "healthy",
        "node_type": "imaging",
        "data_available": data_available,
        "is_training": is_training
    }


@app.get("/ready")
async def readiness_check():
    """Readiness probe for Kubernetes."""
    if is_training:
        raise HTTPException(status_code=503, detail="Currently training")
    return {"status": "ready"}


@app.post("/train", response_model=TrainResponse)
async def train(request: TrainRequest, background_tasks: BackgroundTasks):
    """
    Train the local model on MRI data and extract features.
    
    This simulates federated learning where:
    1. Model trains on local MRI data
    2. Features are extracted
    3. Raw data never leaves this node
    """
    global current_features, is_training, training_history
    
    if is_training:
        raise HTTPException(status_code=409, detail="Training already in progress")
    
    is_training = True
    
    try:
        # Get patient IDs
        if request.patient_ids:
            patient_ids = request.patient_ids
        else:
            # Try to get from data directory or use mock
            patient_ids = get_available_patients(DATA_PATH)
            if not patient_ids:
                patient_ids = ["001"]  # Default mock patient
        
        logger.info(f"Starting training for {len(patient_ids)} patients, {request.epochs} epochs")
        
        # Aggregate features from all patients
        all_features = []
        
        for patient_id in patient_ids:
            # Load MRI data
            volume = load_mri_data(patient_id)
            
            # Simulate training epochs
            for epoch in range(request.epochs):
                loss = simulate_training_epoch(volume, epoch)
                
                training_history.append({
                    "patient_id": patient_id,
                    "epoch": epoch,
                    "loss": float(loss)
                })
                
                logger.info(f"Patient {patient_id}, Epoch {epoch+1}/{request.epochs}, Loss: {loss:.4f}")
            
            # Extract final features
            features = extract_features(volume, feature_dim=128)
            all_features.append(features)
        
        # Average features across patients
        current_features = np.mean(all_features, axis=0)
        final_loss = training_history[-1]["loss"]
        
        logger.info(f"Training completed. Feature dim: {len(current_features)}")
        
        return {
            "status": "success",
            "message": f"Trained on {len(patient_ids)} patients",
            "epochs_completed": request.epochs,
            "final_loss": final_loss,
            "feature_dim": len(current_features)
        }
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        is_training = False


@app.get("/features", response_model=FeaturesResponse)
async def get_features():
    """
    Get the latest extracted features.
    
    These features are sent to the central PINN server.
    Raw MRI data is NEVER shared.
    """
    global current_features
    
    if current_features is None:
        raise HTTPException(
            status_code=404,
            detail="No features available. Run /train first."
        )
    
    return {
        "features": current_features.tolist(),
        "dim": len(current_features),
        "patient_id": None  # Privacy: don't leak patient ID
    }


@app.get("/mesh")
async def get_mesh(patient_id: Optional[str] = None):
    """
    Generate and return a 3D mesh from MRI data.
    
    Returns GLB format for Three.js rendering.
    """
    try:
        if patient_id:
            # Load specific patient's MRI
            volume = load_mri_data(patient_id)
            mesh = generate_uterus_mesh_from_mri(volume)
        else:
            # Generate simplified mesh for demo
            mesh = generate_simplified_uterus_mesh()
        
        # Convert to GLB
        glb_bytes = mesh_to_glb_bytes(mesh)
        
        return Response(
            content=glb_bytes,
            media_type="model/gltf-binary",
            headers={
                "Content-Disposition": "inline; filename=uterus.glb"
            }
        )
        
    except Exception as e:
        logger.error(f"Mesh generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/training/history")
async def get_training_history():
    """Get training history for visualization."""
    return {
        "history": training_history,
        "total_epochs": len(training_history)
    }


@app.get("/patients")
async def list_patients():
    """List available patient IDs."""
    patient_ids = get_available_patients(DATA_PATH)
    return {
        "patients": patient_ids,
        "count": len(patient_ids)
    }


# ==================== Startup ====================

@app.on_event("startup")
async def startup_event():
    """Initialize the node on startup."""
    logger.info("=" * 50)
    logger.info("Imaging Node Starting...")
    logger.info(f"Data path: {DATA_PATH}")
    logger.info(f"Node type: {os.getenv('NODE_TYPE', 'imaging')}")
    logger.info("=" * 50)
    
    # Create data directory if it doesn't exist
    Path(DATA_PATH).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
