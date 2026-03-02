"""
Physics-Informed Neural Network (PINN) Model for Endometriosis Prediction.

This model combines multi-modal features from federated nodes and applies
physics-based constraints derived from tissue biomechanics.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class EndoPINN(nn.Module):
    """
    Physics-Informed Neural Network for Endometriosis prediction.
    
    Architecture:
    - Input: Concatenated features from 3 modalities (imaging + clinical + pathology) + Spatial Coordinates (B, 3)
    - Hidden layers with dropout for regularization (kept enabled during eval for Monte Carlo Dropout)
    - Triple output heads: prediction probability, tissue stiffness, and 3D spatial displacement
    
    Physics Constraints:
    - Navier-Cauchy static equilibrium enforced on displacement using predicted stiffness
    """
    
    def __init__(
        self,
        imaging_dim: int = 128,
        clinical_dim: int = 64,
        pathology_dim: int = 64,
        spatial_dim: int = 3,
        hidden_dims: list = [256, 128, 64],
        dropout: float = 0.3
    ):
        """
        Args:
            imaging_dim: Dimension of imaging features
            clinical_dim: Dimension of clinical features
            pathology_dim: Dimension of pathology features
            spatial_dim: Dimension of spatial coordinates (x,y,z)
            hidden_dims: List of hidden layer dimensions
            dropout: Dropout probability (used for MC Dropout)
        """
        super().__init__()
        
        self.imaging_dim = imaging_dim
        self.clinical_dim = clinical_dim
        self.pathology_dim = pathology_dim
        self.spatial_dim = spatial_dim
        self.dropout_prob = dropout
        
        # Total input dimension
        input_dim = imaging_dim + clinical_dim + pathology_dim + spatial_dim
        
        # Feature fusion layer
        self.fusion = nn.Linear(input_dim, hidden_dims[0])
        self.fusion_bn = nn.BatchNorm1d(hidden_dims[0])
        
        # Hidden layers
        self.hidden_layers = nn.ModuleList()
        self.batch_norms = nn.ModuleList()
        
        for i in range(len(hidden_dims) - 1):
            self.hidden_layers.append(
                nn.Linear(hidden_dims[i], hidden_dims[i + 1])
            )
            self.batch_norms.append(
                nn.BatchNorm1d(hidden_dims[i + 1])
            )
        
        self.dropout = nn.Dropout(dropout)
        
        # Output heads
        final_dim = hidden_dims[-1]
        
        # Head 1: Endometriosis probability (0-1)
        self.prediction_head = nn.Sequential(
            nn.Linear(final_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Sigmoid()  # Output probability
        )
        
        # Head 2: Tissue stiffness E (kPa)
        self.stiffness_head = nn.Sequential(
            nn.Linear(final_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Softplus()  # Ensure positive values
        )
        
        # Head 3: Spatial displacement vector u = (u_x, u_y, u_z) needed for Navier-Cauchy
        self.displacement_head = nn.Sequential(
            nn.Linear(final_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 3) # Output 3D vector
        )

        
        # Initialize weights
        self._initialize_weights()
        
        logger.info(f"Initialized EndoPINN: input_dim={input_dim}, hidden={hidden_dims}")
    
    def _initialize_weights(self):
        """Xavier initialization for better convergence."""
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
    
    def forward(
        self,
        imaging_features: torch.Tensor,
        clinical_features: torch.Tensor,
        pathology_features: torch.Tensor,
        spatial_coords: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        
        Args:
            imaging_features: (batch_size, imaging_dim)
            clinical_features: (batch_size, clinical_dim)
            pathology_features: (batch_size, pathology_dim)
            spatial_coords: (batch_size, 3) 3D coordinate inputs. Extracted if absent.
            
        Returns:
            prediction: (batch_size, 1) - Endometriosis probability
            stiffness: (batch_size, 1) - Tissue stiffness in kPa
            displacement: (batch_size, 3) - Tissue displacement vector
        """
        if spatial_coords is None:
            spatial_coords = torch.zeros((imaging_features.size(0), self.spatial_dim), device=imaging_features.device)
            # Ensure coordinates have requires_grad for Navier-Cauchy
        spatial_coords.requires_grad_(True)
            
        # Concatenate all features
        x = torch.cat([imaging_features, clinical_features, pathology_features, spatial_coords], dim=1)
        
        # Fusion layer
        x = self.fusion(x)
        if x.size(0) > 1:  # BatchNorm requires batch size > 1
            x = self.fusion_bn(x)
        x = F.relu(x)
        x = self.dropout(x)
        
        # Hidden layers
        for hidden, bn in zip(self.hidden_layers, self.batch_norms):
            x = hidden(x)
            if x.size(0) > 1:
                x = bn(x)
            x = F.relu(x)
            x = self.dropout(x)
        
        # Output heads
        prediction = self.prediction_head(x)
        stiffness = self.stiffness_head(x)
        displacement = self.displacement_head(x)
        
        # Scale stiffness to reasonable range (0-15 kPa)
        stiffness = stiffness * 15.0
        
        return prediction, stiffness, displacement
    
    def enable_mc_dropout(self):
        """Force dropout layers active during evaluation for Monte Carlo Uncertainty."""
        for m in self.modules():
            if m.__class__.__name__.startswith('Dropout'):
                m.train()
                
    def predict_with_confidence(
        self,
        imaging_features: torch.Tensor,
        clinical_features: torch.Tensor,
        pathology_features: torch.Tensor,
        spatial_coords: Optional[torch.Tensor] = None,
        mc_samples: int = 10
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Make prediction with rigorous Monte Carlo Dropout uncertainty quantification.
        
        Returns:
            prediction: Mean Endometriosis probability (0-1)
            stiffness: Mean Tissue stiffness
            confidence: Confidence score (1 - normalized variance)
        """
        # Enable MC Dropout explicitly
        self.eval()
        self.enable_mc_dropout()
        
        predictions = []
        stiffnesses = []
        
        with torch.no_grad():
            from torch.utils._pytree import tree_map # For older torch ignore gradient requirement, but MC Dropout evaluates
            # Actually, standard forward pass with dropout requires inference mode off or standard no_grad
            # Since MC Dropout is active, dropout will inject variance into forward passes.
            for _ in range(mc_samples):
                pred, stiff, _ = self.forward(
                    imaging_features, clinical_features, pathology_features, spatial_coords
                )
                predictions.append(pred)
                stiffnesses.append(stiff)
        
        # Stack and calculate statistics
        predictions = torch.stack(predictions)
        stiffnesses = torch.stack(stiffnesses)
        
        mean_prediction = predictions.mean(dim=0)
        mean_stiffness = stiffnesses.mean(dim=0)
        
        # Variance as uncertainty
        stiffness_variance = stiffnesses.var(dim=0)
        
        # Confidence is inversely proportional to variance. 
        # Standard deviation of +/- 2 kPa gives near 0% confidence.
        # std = sqrt(var). If std == 0, conf = 1.0. If std >= 2.0, conf = 0.0
        std = torch.sqrt(stiffness_variance)
        confidence = 1.0 - torch.clamp(std / 2.0, 0.0, 1.0)
        
        # Return model to normal eval mode (disable dropout)
        self.eval()
        
        return mean_prediction, mean_stiffness, confidence.unsqueeze(-1) if confidence.dim() == 1 else confidence
        """
        Make prediction with confidence score.
        
        Confidence is based on consistency with physics constraints.
        
        Returns:
            prediction: Endometriosis probability
            stiffness: Tissue stiffness
            confidence: Confidence score (0-1)
        """
        prediction, stiffness = self.forward(
            imaging_features, clinical_features, pathology_features
        )
        
        # Compute confidence based on physics consistency
        # High confidence when prediction and stiffness are aligned
        expected_stiffness = 1.5 + prediction.squeeze() * 7.0  # Linear mapping
        deviation = torch.abs(stiffness.squeeze() - expected_stiffness)
        confidence = 1.0 - torch.clamp(deviation / 7.0, 0.0, 1.0)
        
        return prediction, stiffness, confidence.unsqueeze(-1)


class EnsemblePINN(nn.Module):
    """
    Ensemble of multiple PINN models for robust predictions.
    Useful for uncertainty quantification.
    """
    
    def __init__(
        self,
        num_models: int = 3,
        **pinn_kwargs
    ):
        """
        Args:
            num_models: Number of models in ensemble
            **pinn_kwargs: Arguments for individual PINN models
        """
        super().__init__()
        
        self.models = nn.ModuleList([
            EndoPINN(**pinn_kwargs) for _ in range(num_models)
        ])
        
        logger.info(f"Initialized Ensemble with {num_models} models")
    
    def forward(
        self,
        imaging_features: torch.Tensor,
        clinical_features: torch.Tensor,
        pathology_features: torch.Tensor,
        spatial_coords: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Forward pass through ensemble.
        
        Returns:
            mean_prediction: Average prediction
            mean_stiffness: Average stiffness
            std_prediction: Standard deviation (uncertainty)
        """
        predictions = []
        stiffnesses = []
        
        for model in self.models:
            pred, stiff, _ = model(imaging_features, clinical_features, pathology_features, spatial_coords)
            predictions.append(pred)
            stiffnesses.append(stiff)
        
        predictions = torch.stack(predictions)
        stiffnesses = torch.stack(stiffnesses)
        
        mean_pred = predictions.mean(dim=0)
        mean_stiff = stiffnesses.mean(dim=0)
        std_pred = predictions.std(dim=0)
        
        return mean_pred, mean_stiff, std_pred


def load_model(checkpoint_path: str, device: str = 'cpu') -> EndoPINN:
    """
    Load a saved model from checkpoint.
    
    Args:
        checkpoint_path: Path to checkpoint file
        device: Device to load model on
        
    Returns:
        Loaded model
    """
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    model = EndoPINN(
        imaging_dim=checkpoint.get('imaging_dim', 128),
        clinical_dim=checkpoint.get('clinical_dim', 64),
        pathology_dim=checkpoint.get('pathology_dim', 64),
    )
    
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    logger.info(f"Loaded model from {checkpoint_path}")
    
    return model


def save_model(
    model: EndoPINN,
    save_path: str,
    optimizer: Optional[torch.optim.Optimizer] = None,
    epoch: Optional[int] = None,
    loss: Optional[float] = None
):
    """
    Save model checkpoint.
    
    Args:
        model: Model to save
        save_path: Path to save checkpoint
        optimizer: Optional optimizer state
        epoch: Optional epoch number
        loss: Optional loss value
    """
    checkpoint = {
        'model_state_dict': model.state_dict(),
        'imaging_dim': model.imaging_dim,
        'clinical_dim': model.clinical_dim,
        'pathology_dim': model.pathology_dim,
    }
    
    if optimizer is not None:
        checkpoint['optimizer_state_dict'] = optimizer.state_dict()
    if epoch is not None:
        checkpoint['epoch'] = epoch
    if loss is not None:
        checkpoint['loss'] = loss
    
    torch.save(checkpoint, save_path)
    logger.info(f"Saved model to {save_path}")
