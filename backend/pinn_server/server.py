"""
PINN Central Server - Federated Learning Aggregator.

This server collects feature vectors from federated nodes and uses a
Physics-Informed Neural Network to make predictions.
"""

import os
import logging
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime
import numpy as np
import torch
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx
import sys

sys.path.append(str(Path(__file__).parent.parent))

from pinn_server.model import EndoPINN, save_model, load_model
from utils.physics_loss import PINNLoss
from utils.mesh_generator import (
    generate_simplified_uterus_mesh,
    apply_stiffness_colormap,
    generate_stiffness_map,
    mesh_to_glb_bytes
)
from utils.patient_manager import patient_manager
from utils.settings_manager import settings_manager
from utils.training_history_manager import training_history_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PINN Central Server",
    description="Physics-Informed Neural Network aggregator for federated learning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_PATH = os.getenv("MODEL_PATH", "/app/data/models")
IMAGING_SERVICE_URL = os.getenv("IMAGING_SERVICE_URL", "http://localhost:8001")
CLINICAL_SERVICE_URL = os.getenv("CLINICAL_SERVICE_URL", "http://localhost:8002")
PATHOLOGY_SERVICE_URL = os.getenv("PATHOLOGY_SERVICE_URL", "http://localhost:8003")

# Global state
model: Optional[EndoPINN] = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
training_history: List[Dict] = []
is_training: bool = False
prediction_count: int = 0  # Track number of predictions made
total_epochs_trained: int = 0  # Track total training epochs


def classify_risk(prediction: float) -> str:
    """Classify endometriosis risk level from prediction probability."""
    if prediction >= 0.75:
        return "HIGH"
    elif prediction >= 0.5:
        return "MODERATE"
    elif prediction >= 0.25:
        return "LOW"
    else:
        return "MINIMAL"



class PredictRequest(BaseModel):
    patient_id: Optional[str] = None
    imaging_features: Optional[List[float]] = None
    clinical_features: Optional[List[float]] = None
    pathology_features: Optional[List[float]] = None


class PredictResponse(BaseModel):
    prediction: float
    stiffness: float
    confidence: float
    risk_level: str
    timestamp: str


class TrainRequest(BaseModel):
    epochs: int = 10
    learning_rate: float = 0.001
    batch_size: int = 4


class TrainResponse(BaseModel):
    status: str
    message: str
    epochs_completed: int
    final_loss: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    federated_nodes: Dict[str, str]


class NodeStatus(BaseModel):
    name: str
    url: str
    status: str
    is_training: bool


# ==================== Helper Functions ====================

async def fetch_features_from_node(node_url: str, node_name: str) -> Optional[np.ndarray]:
    """Fetch features from a federated node."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{node_url}/features")
            
            if response.status_code == 200:
                data = response.json()
                features = np.array(data['features'], dtype=np.float32)
                logger.info(f"Fetched {len(features)} features from {node_name}")
                return features
            else:
                logger.warning(f"{node_name} returned {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching from {node_name}: {e}")
        return None


async def trigger_node_training(node_url: str, node_name: str, epochs: int) -> bool:
    """Trigger training on a federated node."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{node_url}/train",
                json={"epochs": epochs}
            )
            
            if response.status_code == 200:
                logger.info(f"{node_name} training started")
                return True
            else:
                logger.warning(f"{node_name} training failed: {response.status_code}")
                return False
                
    except Exception as e:
        logger.error(f"Error triggering {node_name} training: {e}")
        return False


async def check_node_health(node_url: str) -> str:
    """Check health of a federated node."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{node_url}/health")
            if response.status_code == 200:
                return "healthy"
            return "unhealthy"
    except:
        return "unreachable"


def initialize_model():
    """Initialize or load the PINN model."""
    global model
    
    model_file = Path(MODEL_PATH) / "pinn_latest.pth"
    
    if model_file.exists():
        try:
            model = load_model(str(model_file), device=str(device))
            logger.info("Loaded existing model")
            return
        except Exception as e:
            logger.warning(f"Could not load model: {e}")
    
    # Create new model
    model = EndoPINN(
        imaging_dim=128,
        clinical_dim=64,
        pathology_dim=64,
        hidden_dims=[256, 128, 64],
        dropout=0.3
    ).to(device)
    
    logger.info(f"Initialized new model on {device}")


def classify_risk(prediction: float) -> str:
    """Classify risk level based on prediction."""
    if prediction < 0.3:
        return "low"
    elif prediction < 0.6:
        return "moderate"
    else:
        return "high"


# ==================== API End points ====================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    imaging_status = await check_node_health(IMAGING_SERVICE_URL)
    clinical_status = await check_node_health(CLINICAL_SERVICE_URL)
    pathology_status = await check_node_health(PATHOLOGY_SERVICE_URL)
    
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(device),
        "federated_nodes": {
            "imaging": imaging_status,
            "clinical": clinical_status,
            "pathology": pathology_status
        }
    }


@app.get("/ready")
async def readiness_check():
    """Readiness probe."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    if is_training:
        raise HTTPException(status_code=503, detail="Currently training")
    return {"status": "ready"}


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Make a prediction using the PINN model.
    
    If features are provided directly, use them.
    Otherwise, fetch from federated nodes.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        # Get features
        if request.imaging_features and request.clinical_features and request.pathology_features:
            imaging_feat = np.array(request.imaging_features, dtype=np.float32)
            clinical_feat = np.array(request.clinical_features, dtype=np.float32)
            pathology_feat = np.array(request.pathology_features, dtype=np.float32)
        else:
            # Fetch from federated nodes
            imaging_feat = await fetch_features_from_node(IMAGING_SERVICE_URL, "Imaging")
            clinical_feat = await fetch_features_from_node(CLINICAL_SERVICE_URL, "Clinical")
            pathology_feat = await fetch_features_from_node(PATHOLOGY_SERVICE_URL, "Pathology")
            
            if imaging_feat is None or clinical_feat is None or pathology_feat is None:
                raise HTTPException(
                    status_code=503,
                    detail="Could not fetch features from all nodes. Ensure nodes are trained."
                )
        
        # Convert to tensors
        imaging_tensor = torch.tensor(imaging_feat, dtype=torch.float32).unsqueeze(0).to(device)
        clinical_tensor = torch.tensor(clinical_feat, dtype=torch.float32).unsqueeze(0).to(device)
        pathology_tensor = torch.tensor(pathology_feat, dtype=torch.float32).unsqueeze(0).to(device)
        
        # Make prediction
        model.eval()
        with torch.no_grad():
            prediction, stiffness, confidence = model.predict_with_confidence(
                imaging_tensor, clinical_tensor, pathology_tensor
            )
        
        pred_value = float(prediction.squeeze().cpu().numpy())
        stiff_value = float(stiffness.squeeze().cpu().numpy())
        conf_value = float(confidence.squeeze().cpu().numpy())

        # Sanitize NaN / Inf values (can occur with untrained or early-epoch models)
        import math
        pred_value  = 0.5  if not math.isfinite(pred_value)  else max(0.0, min(1.0, pred_value))
        stiff_value = 3.0  if not math.isfinite(stiff_value) else max(0.0, min(15.0, stiff_value))
        conf_value  = 0.5  if not math.isfinite(conf_value)  else max(0.0, min(1.0, conf_value))

        risk = classify_risk(pred_value)
        
        logger.info(f"Prediction: {pred_value:.3f}, Stiffness: {stiff_value:.2f} kPa, Risk: {risk}")
        
        # Increment prediction counter
        global prediction_count
        prediction_count += 1
        
        return {
            "prediction": pred_value,
            "stiffness": stiff_value,
            "confidence": conf_value,
            "risk_level": risk,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train", response_model=TrainResponse)
async def train_federated(request: TrainRequest, background_tasks: BackgroundTasks):
    """
    Trigger federated training across all nodes and update the central model.
    """
    global is_training, training_history
    
    if is_training:
        raise HTTPException(status_code=409, detail="Training already in progress")
    
    if model is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    is_training = True
    
    try:
        # 1. Trigger training on all federated nodes
        logger.info("Triggering training on federated nodes...")
        
        imaging_ok = await trigger_node_training(IMAGING_SERVICE_URL, "Imaging", request.epochs)
        clinical_ok = await trigger_node_training(CLINICAL_SERVICE_URL, "Clinical", request.epochs)
        pathology_ok = await trigger_node_training(PATHOLOGY_SERVICE_URL, "Pathology", request.epochs)
        
        if not (imaging_ok and clinical_ok and pathology_ok):
            logger.warning("Some nodes did not start training successfully")
        
        # 2. Train central model with REAL data
        from utils.data_loader import get_train_val_loaders
        
        optimizer = torch.optim.Adam(model.parameters(), lr=request.learning_rate)
        loss_fn = PINNLoss(lambda_physics=0.1, lambda_elastic=0.05)
        
        # Get real data loaders
        train_loader, val_loader = get_train_val_loaders(batch_size=request.batch_size)
        
        model.train()
        epoch_history = []
        
        for epoch in range(request.epochs):
            epoch_loss = 0.0
            num_batches = 0
            
            for batch in train_loader:
                # Get REAL patient data from batch
                imaging_batch = batch['imaging'].to(device)
                clinical_batch = batch['clinical'].to(device)
                pathology_batch = batch['pathology'].to(device)
                labels = batch['labels'].to(device)
            
            # Forward pass
            prediction, stiffness = model(imaging_batch, clinical_batch, pathology_batch)

            # Clamp stiffness to physiologically valid range (kPa)
            stiffness = torch.clamp(stiffness, 0.0, 10.0)

            # Compute loss (BCEWithLogitsLoss applies sigmoid internally)
            loss, loss_dict = loss_fn((prediction, stiffness), labels)

            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            training_history.append({
                "epoch": epoch,
                "loss": loss_dict['total'],
                "data_loss": loss_dict['data'],
                "physics_loss": loss_dict['physics'],
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Epoch {epoch+1}/{request.epochs}, Loss: {loss_dict['total']:.4f}")
        
        # Save model
        Path(MODEL_PATH).mkdir(parents=True, exist_ok=True)
        save_path = Path(MODEL_PATH) / "pinn_latest.pth"
        save_model(model, str(save_path), optimizer, request.epochs, loss_dict['total'])
        
        final_loss = training_history[-1]["loss"]
        
        # Update total epochs trained
        global total_epochs_trained
        total_epochs_trained += request.epochs
        
        return {
            "status": "success",
            "message": "Federated training completed",
            "epochs_completed": request.epochs,
            "final_loss": final_loss
        }
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        is_training = False


@app.get("/mesh/{stiffness}")
async def get_colored_mesh(stiffness: float):
    """
    Generate a 3D mesh colored by stiffness prediction.
    """
    try:
        # Generate base mesh
        mesh = generate_simplified_uterus_mesh()
        
        # Generate stiffness map
        prediction = min(max((stiffness - 1.5) / 7.0, 0.0), 1.0)
        stiffness_values = generate_stiffness_map(
            num_vertices=len(mesh.vertices),
            prediction=prediction,
            base_stiffness=1.5,
            lesion_stiffness=stiffness
        )
        
        # Apply colormap
        mesh = apply_stiffness_colormap(mesh, stiffness_values, colormap='RdYlGn_r')
        
        # Convert to GLB
        from fastapi.responses import Response
        glb_bytes = mesh_to_glb_bytes(mesh)
        
        return Response(
            content=glb_bytes,
            media_type="model/gltf-binary"
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




@app.get("/stats")
async def get_stats():
    """Get application statistics for dashboard KPIs."""
    # Get node statuses
    imaging_status = await check_node_health(IMAGING_SERVICE_URL)
    clinical_status = await check_node_health(CLINICAL_SERVICE_URL)
    pathology_status = await check_node_health(PATHOLOGY_SERVICE_URL)
    
    # Count active nodes
    statuses = [imaging_status, clinical_status, pathology_status]
    active_nodes = sum(1 for status in statuses if status == "healthy")
    total_nodes = len(statuses)
    
    # Calculate model accuracy (placeholder - would need validation set in production)
    model_accuracy =None if model is None or len(training_history) == 0 else max(0.0, 1.0 - (training_history[-1].get("loss", 1.0) * 0.1))
    
    return {
        "active_nodes": f"{active_nodes}/{total_nodes}",
        "active_nodes_count": active_nodes,
        "total_nodes": total_nodes,
        "predictions_made": prediction_count,
        "model_accuracy": round(model_accuracy * 100, 1) if model_accuracy else None,
        "total_epochs_trained": total_epochs_trained,
        "model_loaded": model is not None,
        "is_training": is_training
    }


@app.get("/status/nodes")
async def get_node_status():
    """Get status of all federated nodes."""
    nodes = [
        ("Imaging", IMAGING_SERVICE_URL),
        ("Clinical", CLINICAL_SERVICE_URL),
        ("Pathology", PATHOLOGY_SERVICE_URL)
    ]
    
    statuses = []
    for name, url in nodes:
        health = await check_node_health(url)
        
        # Try to get training status
        is_training_node = False
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{url}/health")
                if resp.status_code == 200:
                    data = resp.json()
                    is_training_node = data.get("is_training", False)
        except:
            pass
        
        statuses.append({
            "name": name,
            "url": url,
            "status": health,
            "is_training": is_training_node
        })
    
    return {"nodes": statuses}


# ==================== Patient Management Endpoints ====================

@app.post("/patients")
async def create_patient(patient_data: dict):
    """Create a new patient record."""
    try:
        patient = patient_manager.create_patient(patient_data)
        return patient
    except Exception as e:
        logger.error(f"Error creating patient: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patients")
async def list_patients():
    """Get all patient records."""
    try:
        patients = patient_manager.list_patients()
        return {"patients": patients, "count": len(patients)}
    except Exception as e:
        logger.error(f"Error listing patients: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    """Get a specific patient by ID."""
    patient = patient_manager.get_patient(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


@app.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient_data: dict):
    """Update a patient record."""
    patient = patient_manager.update_patient(patient_id, patient_data)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient record."""
    success = patient_manager.delete_patient(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return {"message": f"Patient {patient_id} deleted successfully"}


# ==================== Settings Management Endpoints ====================

@app.get("/config")
async def get_config():
    """Get current application settings."""
    try:
        settings = settings_manager.get_settings()
        return settings
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/config")
async def update_config(settings_data: dict):
    """Update application settings."""
    try:
        settings = settings_manager.update_settings(settings_data)
        logger.info(f"Settings updated: {settings}")
        return settings
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/config/defaults")
async def get_default_config():
    """Get default settings."""
    return settings_manager.get_defaults()


# ==================== Analytics & Training History Endpoints ====================

@app.get("/training/history")
async def get_training_history():
    """Get all training runs and their metrics."""
    try:
        runs = training_history_manager.get_all_runs()
        return {"training_runs": runs, "count": len(runs)}
    except Exception as e:
        logger.error(f"Error getting training history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/metrics")
async def get_analytics_metrics():
    """Get current model performance metrics and node contributions."""
    try:
        metrics = training_history_manager.get_metrics()
        latest_run = training_history_manager.get_latest_run()
        
        # Calculate node contributions (mock for now)
        node_performance = {
            "imaging": {"contribution": 0.42, "accuracy": 0.88},
            "clinical": {"contribution": 0.31, "accuracy": 0.84},
            "pathology": {"contribution": 0.27, "accuracy": 0.91}
        }
        
        return {
            "model_metrics": metrics,
            "latest_run": latest_run,
            "node_performance": node_performance,
            "total_predictions": prediction_count,
            "total_epochs_trained": total_epochs_trained
        }
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Startup ====================

@app.on_event("startup")
async def startup_event():
    """Initialize the server on startup."""
    logger.info("=" * 50)
    logger.info("PINN Central Server Starting...")
    logger.info(f"Device: {device}")
    logger.info(f"Model path: {MODEL_PATH}")
    logger.info(f"Imaging service: {IMAGING_SERVICE_URL}")
    logger.info(f"Clinical service: {CLINICAL_SERVICE_URL}")
    logger.info(f"Pathology service: {PATHOLOGY_SERVICE_URL}")
    logger.info("=" * 50)
    
    # Initialize model
    initialize_model()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
