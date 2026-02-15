"""
Clinical Node - Federated Learning Client for Patient Clinical Records.

This node processes structured clinical patient data (symptoms, demographics, history).
Raw patient records never leave this pod.
"""

import os
import logging
from pathlib import Path
from typing import List, Optional, Dict
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.preprocessing import StandardScaler
import sys

sys.path.append(str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Clinical Node",
    description="Federated learning client for clinical data processing",
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


def load_clinical_data(patient_id: str) -> Dict:
    """Load clinical data for a patient."""
    filepath = Path(DATA_PATH) / "records.csv"
    
    if filepath.exists():
        df = pd.read_csv(filepath)
        patient_data = df[df['patient_id'] == patient_id]
        if not patient_data.empty:
            return patient_data.iloc[0].to_dict()
    
    # Generate mock data
    return generate_mock_clinical_data(patient_id)


def generate_mock_clinical_data(patient_id: str) -> Dict:
    """Generate synthetic clinical data."""
    np.random.seed(hash(patient_id) % 2**32)
    
    return {
        "patient_id": patient_id,
        "age": np.random.randint(18, 50),
        "bmi": np.random.uniform(18.5, 35.0),
        "pain_score": np.random.randint(0, 11),  # 0-10 scale
        "menstrual_cycle_length": np.random.randint(21, 35),
        "dysmenorrhea": np.random.choice([0, 1]),  # Binary: yes/no
        "dyspareunia": np.random.choice([0, 1]),
        "chronic_pelvic_pain": np.random.choice([0, 1]),
        "infertility": np.random.choice([0, 1]),
        "previous_surgeries": np.random.randint(0, 5),
        "family_history": np.random.choice([0, 1]),
        "hormonal_therapy": np.random.choice([0, 1]),
    }


def extract_clinical_features(data: Dict, feature_dim: int = 64) -> np.ndarray:
    """Extract and normalize clinical features."""
    # Numerical features
    numerical = np.array([
        data.get("age", 30) / 50.0,  # Normalize to [0, 1]
        data.get("bmi", 25) / 40.0,
        data.get("pain_score", 5) / 10.0,
        data.get("menstrual_cycle_length", 28) / 35.0,
        data.get("previous_surgeries", 0) / 5.0,
    ])
    
    # Binary features
    binary = np.array([
        float(data.get("dysmenorrhea", 0)),
        float(data.get("dyspareunia", 0)),
        float(data.get("chronic_pelvic_pain", 0)),
        float(data.get("infertility", 0)),
        float(data.get("family_history", 0)),
        float(data.get("hormonal_therapy", 0)),
    ])
    
    # Combine
    base_features = np.concatenate([numerical, binary])
    
    # Expand to target dimension with learned projections (simulated)
    if len(base_features) < feature_dim:
        # Simulate encoding to higher dimension
        expansion = np.random.randn(feature_dim - len(base_features)) * 0.1
        features = np.concatenate([base_features, expansion])
    else:
        features = base_features[:feature_dim]
    
    # Normalize
    features = features / (np.linalg.norm(features) + 1e-8)
    
    return features


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "healthy",
        "node_type": "clinical",
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
            clinical_data = load_clinical_data(patient_id)
            
            for epoch in range(request.epochs):
                # Simulate training loss
                loss = 1.0 * np.exp(-epoch * 0.2) + np.random.randn() * 0.03
                loss = max(loss, 0.01)
                
                training_history.append({
                    "patient_id": patient_id,
                    "epoch": epoch,
                    "loss": float(loss)
                })
                
                logger.info(f"Patient {patient_id}, Epoch {epoch+1}, Loss: {loss:.4f}")
            
            features = extract_clinical_features(clinical_data, feature_dim=64)
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
    logger.info("Clinical Node Starting...")
    logger.info(f"Data path: {DATA_PATH}")
    logger.info("=" * 50)
    Path(DATA_PATH).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
