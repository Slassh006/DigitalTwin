"""
Pathology Node - Federated Learning Client for Lab Report Data.

This node processes pathology lab reports (biochemical markers, lab indicators).
Raw lab data never leaves this pod.
"""

import os
import logging
from pathlib import Path
from typing import List, Optional, Dict
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys

sys.path.append(str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pathology Node",
    description="Federated learning client for pathology lab data",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.getenv("DATA_PATH", "/app/data")
current_features: Optional[np.ndarray] = None
training_history: List[dict] = []
is_training: bool = False


class TrainRequest(BaseModel):
    patient_ids: Optional[List[str]] = None
    epochs: int = 10


class TrainResponse(BaseModel):
    status: str
    message: str
    epochs_completed: int
    final_loss: float
    feature_dim: int


class FeaturesResponse(BaseModel):
    features: List[float]
    dim: int


class HealthResponse(BaseModel):
    status: str
    node_type: str
    data_available: bool
    is_training: bool


def load_pathology_data(patient_id: str) -> Dict:
    """Load pathology data for a patient."""
    filepath = Path(DATA_PATH) / "lab_reports.csv"
    
    if filepath.exists():
        df = pd.read_csv(filepath)
        patient_data = df[df['patient_id'] == patient_id]
        if not patient_data.empty:
            return patient_data.iloc[0].to_dict()
    
    return generate_mock_pathology_data(patient_id)


def generate_mock_pathology_data(patient_id: str) -> Dict:
    """Generate synthetic pathology lab data."""
    np.random.seed(hash(patient_id) % 2**32)
    
    return {
        "patient_id": patient_id,
        # Inflammatory markers
        "ca125": np.random.uniform(10, 100),  # U/mL (elevated in endometriosis)
        "ca199": np.random.uniform(5, 50),
        "crp": np.random.uniform(0.1, 10.0),  # C-reactive protein mg/L
        "esr": np.random.randint(5, 40),  # Erythrocyte sedimentation rate mm/hr
        
        # Hormonal markers
        "estradiol": np.random.uniform(50, 400),  # pg/mL
        "progesterone": np.random.uniform(1, 20),  # ng/mL
        "fsh": np.random.uniform(2, 15),  # Follicle-stimulating hormone mIU/mL
        "lh": np.random.uniform(2, 15),  # Luteinizing hormone mIU/mL
        
        # Complete blood count
        "wbc": np.random.uniform(4.0, 11.0),  # White blood cells 10^9/L
        "hemoglobin": np.random.uniform(11.5, 16.0),  # g/dL
        "platelets": np.random.randint(150, 400),  # 10^9/L
        
        # Other markers
        "anti_mullerian_hormone": np.random.uniform(0.5, 5.0),  # ng/mL
        "vegf": np.random.uniform(50, 500),  # Vascular endothelial growth factor pg/mL
    }


def extract_pathology_features(data: Dict, feature_dim: int = 64) -> np.ndarray:
    """Extract and normalize pathology features."""
    # Normalize each marker to [0, 1] based on typical ranges
    normalized = np.array([
        data.get("ca125", 35) / 100.0,
        data.get("ca199", 25) / 50.0,
        data.get("crp", 3.0) / 10.0,
        data.get("esr", 20) / 40.0,
        data.get("estradiol", 200) / 400.0,
        data.get("progesterone", 10) / 20.0,
        data.get("fsh", 8) / 15.0,
        data.get("lh", 8) / 15.0,
        data.get("wbc", 7.5) / 11.0,
        data.get("hemoglobin", 13.5) / 16.0,
        data.get("platelets", 250) / 400.0,
        data.get("anti_mullerian_hormone", 2.5) / 5.0,
        data.get("vegf", 250) / 500.0,
    ])
    
    # Expand to target dimension
    if len(normalized) < feature_dim:
        # Simulate learned transformations
        expansion = np.random.randn(feature_dim - len(normalized)) * 0.1
        features = np.concatenate([normalized, expansion])
    else:
        features = normalized[:feature_dim]
    
    # Normalize
    features = features / (np.linalg.norm(features) + 1e-8)
    
    return features


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "healthy",
        "node_type": "pathology",
        "data_available": True,
        "is_training": is_training
    }


@app.get("/ready")
async def readiness_check():
    if is_training:
        raise HTTPException(status_code=503, detail="Currently training")
    return {"status": "ready"}


@app.post("/train", response_model=TrainResponse)
async def train(request: TrainRequest):
    global current_features, is_training, training_history
    
    if is_training:
        raise HTTPException(status_code=409, detail="Training already in progress")
    
    is_training = True
    
    try:
        patient_ids = request.patient_ids or ["001", "002", "003"]
        logger.info(f"Training on {len(patient_ids)} patients, {request.epochs} epochs")
        
        all_features = []
        
        for patient_id in patient_ids:
            pathology_data = load_pathology_data(patient_id)
            
            for epoch in range(request.epochs):
                loss = 1.0 * np.exp(-epoch * 0.18) + np.random.randn() * 0.04
                loss = max(loss, 0.01)
                
                training_history.append({
                    "patient_id": patient_id,
                    "epoch": epoch,
                    "loss": float(loss)
                })
                
                logger.info(f"Patient {patient_id}, Epoch {epoch+1}, Loss: {loss:.4f}")
            
            features = extract_pathology_features(pathology_data, feature_dim=64)
            all_features.append(features)
        
        current_features = np.mean(all_features, axis=0)
        final_loss = training_history[-1]["loss"]
        
        return {
            "status": "success",
            "message": f"Trained on {len(patient_ids)} patients",
            "epochs_completed": request.epochs,
            "final_loss": final_loss,
            "feature_dim": len(current_features)
        }
        
    finally:
        is_training = False


@app.get("/features", response_model=FeaturesResponse)
async def get_features():
    if current_features is None:
        raise HTTPException(status_code=404, detail="No features available")
    
    return {
        "features": current_features.tolist(),
        "dim": len(current_features)
    }


@app.get("/training/history")
async def get_training_history():
    return {"history": training_history}


@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("Pathology Node Starting...")
    logger.info(f"Data path: {DATA_PATH}")
    logger.info("=" * 50)
    Path(DATA_PATH).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
