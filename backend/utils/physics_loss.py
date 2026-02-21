"""Physics-informed loss functions for the PINN."""

import torch
import torch.nn as nn
from typing import Tuple, Optional


def physics_loss(
    prediction: torch.Tensor,
    stiffness: torch.Tensor,
    healthy_threshold: float = 0.5,
    healthy_stiffness_max: float = 2.0,
    endo_stiffness_min: float = 5.0
) -> torch.Tensor:
    """
    Physics-informed constraint based on tissue mechanics.
    
    Biological basis:
    - Healthy uterine tissue: Young's modulus ~1-2 kPa
    - Endometriotic lesions: Increased stiffness ~5-10 kPa due to fibrosis
    
    Args:
        prediction: Model's endometriosis probability (0-1)
        stiffness: Model's predicted tissue stiffness (kPa)
        healthy_threshold: Threshold for classification (default 0.5)
        healthy_stiffness_max: Maximum stiffness for healthy tissue (kPa)
        endo_stiffness_min: Minimum stiffness for endometriosis (kPa)
        
    Returns:
        Physics constraint penalty
    """
    # Constraint 1: If predicted as endometriosis (>0.5), stiffness should be >5 kPa
    endo_mask = prediction > healthy_threshold
    endo_violation = torch.relu(endo_stiffness_min - stiffness) * endo_mask.float()
    
    # Constraint 2: If predicted as healthy (<0.5), stiffness should be <2 kPa
    healthy_mask = prediction <= healthy_threshold
    healthy_violation = torch.relu(stiffness - healthy_stiffness_max) * healthy_mask.float()
    
    # Total violation
    total_violation = endo_violation + healthy_violation
    
    return total_violation.mean()


def elasticity_regularization(stiffness: torch.Tensor) -> torch.Tensor:
    """
    Regularization to keep stiffness values in physiologically plausible range.
    
    Args:
        stiffness: Predicted tissue stiffness values
        
    Returns:
        Regularization penalty
    """
    # Penalize extreme values (tissue stiffness should be 0-15 kPa)
    min_stiffness = 0.0
    max_stiffness = 15.0
    
    lower_violation = torch.relu(min_stiffness - stiffness)
    upper_violation = torch.relu(stiffness - max_stiffness)
    
    return (lower_violation + upper_violation).mean()


class PINNLoss(nn.Module):
    """
    Combined loss function for Physics-Informed Neural Network.
    
    Loss = MSE_data + λ_physics * L_physics + λ_elastic * L_elastic
    """
    
    def __init__(
        self,
        lambda_physics: float = 0.1,
        lambda_elastic: float = 0.05,
        **physics_kwargs
    ):
        """
        Args:
            lambda_physics: Weight for physics constraint loss
            lambda_elastic: Weight for elasticity regularization
            **physics_kwargs: Additional arguments for physics_loss
        """
        super().__init__()
        self.lambda_physics = lambda_physics
        self.lambda_elastic = lambda_elastic
        self.physics_kwargs = physics_kwargs
        self.mse = nn.MSELoss()
    
    def forward(
        self,
        pred_output: Tuple[torch.Tensor, torch.Tensor],
        target_labels: torch.Tensor,
        target_stiffness: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, dict]:
        """
        Args:
            pred_output: Tuple of (prediction, stiffness) from model
            target_labels: Ground truth labels (0 or 1)
            target_stiffness: Optional ground truth stiffness values
            
        Returns:
            Total loss and dictionary of individual loss components
        """
        prediction, stiffness = pred_output

        # ── Data loss ────────────────────────────────────────────────────────
        # IMPORTANT: the model's prediction_head already applies nn.Sigmoid(),
        # so we must use BCELoss (NOT BCEWithLogitsLoss which would double-apply
        # sigmoid and produce saturated 0/1 → log(0) = -inf → NaN everywhere).
        EPS = 1e-7
        pred_clamped = torch.clamp(prediction, EPS, 1.0 - EPS)
        bce = nn.BCELoss()
        data_loss = bce(pred_clamped, target_labels.float())
        
        # If we have ground truth stiffness, use MSE
        if target_stiffness is not None:
            stiffness_loss = self.mse(stiffness, target_stiffness)
            data_loss = data_loss + 0.5 * stiffness_loss
        
        # Physics constraint loss
        phys_loss = physics_loss(prediction, stiffness, **self.physics_kwargs)
        
        # Elasticity regularization
        elastic_loss = elasticity_regularization(stiffness)
        
        # Total loss
        total_loss = (
            data_loss +
            self.lambda_physics * phys_loss +
            self.lambda_elastic * elastic_loss
        )
        
        loss_dict = {
            'total': total_loss.item(),
            'data': data_loss.item(),
            'physics': phys_loss.item(),
            'elastic': elastic_loss.item()
        }
        
        return total_loss, loss_dict


def compute_confidence(prediction: torch.Tensor, stiffness: torch.Tensor) -> torch.Tensor:
    """
    Compute confidence score based on prediction consistency with physics.
    
    High confidence when:
    - High prediction + high stiffness
    - Low prediction + low stiffness
    
    Low confidence when:
    - High prediction + low stiffness (violation)
    - Low prediction + high stiffness (violation)
    
    Args:
        prediction: Endometriosis probability
        stiffness: Tissue stiffness
        
    Returns:
        Confidence score (0-1)
    """
    # Expected stiffness for given prediction
    expected_stiffness = 1.5 + prediction * 7.0  # Maps 0→1.5 kPa, 1→8.5 kPa
    
    # Consistency score (inverse of deviation)
    deviation = torch.abs(stiffness - expected_stiffness)
    max_deviation = 7.0  # Maximum expected deviation
    confidence = 1.0 - torch.clamp(deviation / max_deviation, 0.0, 1.0)
    
    return confidence
