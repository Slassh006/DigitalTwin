"""Physics-informed loss functions for the PINN."""

import torch
import torch.nn as nn
from typing import Tuple, Optional


def navier_cauchy_residual(
    displacement: torch.Tensor,
    coords: torch.Tensor,
    youngs_modulus: torch.Tensor,
    poisson_ratio: float = 0.49  # Incompressible tissue
) -> torch.Tensor:
    """
    Computes the residual of the Navier-Cauchy equations for static equilibrium.
    
    Args:
        displacement: Model's predicted displacement field (B, 3)
        coords: Spatial coordinates (B, 3)
        youngs_modulus: Predicted stiffness/Young's Modulus E in kPa (B, 1)
        poisson_ratio: Poisson's ratio (nu) for the tissue
        
    Returns:
        Physics residual penalty
    """
    # 1. Compute Lamé Parameters from Young's Modulus and Poisson's ratio
    # µ (Shear modulus) = E / (2 * (1 + nu))
    mu = youngs_modulus / (2.0 * (1.0 + poisson_ratio))
    
    # λ (Lamé's first parameter) = E*nu / ((1 + nu) * (1 - 2*nu))
    # We clip the denominator for nu near 0.5 (incompressibility) to avoid division by zero
    nu_denom = max(1.0 - 2.0 * poisson_ratio, 1e-5)
    lmbda = (youngs_modulus * poisson_ratio) / ((1.0 + poisson_ratio) * nu_denom)
    
    # 2. Compute Spatial Derivatives using Automatic Differentiation
    # Create computation graph for spatial derivatives
    
    u_x, u_y, u_z = displacement[:, 0:1], displacement[:, 1:2], displacement[:, 2:3]
    
    # First derivatives
    du_dx = torch.autograd.grad(u_x, coords, torch.ones_like(u_x), create_graph=True, retain_graph=True)[0]
    du_dy = torch.autograd.grad(u_y, coords, torch.ones_like(u_y), create_graph=True, retain_graph=True)[0]
    du_dz = torch.autograd.grad(u_z, coords, torch.ones_like(u_z), create_graph=True, retain_graph=True)[0]
    
    # Strain tensor components (linearized epsilon = 0.5 * (grad(u) + grad(u)^T))
    eps_xx = du_dx[:, 0:1]
    eps_yy = du_dy[:, 1:2]
    eps_zz = du_dz[:, 2:3]
    
    # Volumetric strain (Trace of the strain tensor)
    volumetric_strain = eps_xx + eps_yy + eps_zz
    
    # Second derivatives (Laplacian of displacement)
    d2u_x_dx2 = torch.autograd.grad(du_dx[:, 0:1], coords, torch.ones_like(du_dx[:, 0:1]), create_graph=True, retain_graph=True)[0][:, 0:1]
    d2u_x_dy2 = torch.autograd.grad(du_dx[:, 1:2], coords, torch.ones_like(du_dx[:, 1:2]), create_graph=True, retain_graph=True)[0][:, 1:2]
    d2u_x_dz2 = torch.autograd.grad(du_dx[:, 2:3], coords, torch.ones_like(du_dx[:, 2:3]), create_graph=True, retain_graph=True)[0][:, 2:3]
    laplacian_u_x = d2u_x_dx2 + d2u_x_dy2 + d2u_x_dz2
    
    d2u_y_dx2 = torch.autograd.grad(du_dy[:, 0:1], coords, torch.ones_like(du_dy[:, 0:1]), create_graph=True, retain_graph=True)[0][:, 0:1]
    d2u_y_dy2 = torch.autograd.grad(du_dy[:, 1:2], coords, torch.ones_like(du_dy[:, 1:2]), create_graph=True, retain_graph=True)[0][:, 1:2]
    d2u_y_dz2 = torch.autograd.grad(du_dy[:, 2:3], coords, torch.ones_like(du_dy[:, 2:3]), create_graph=True, retain_graph=True)[0][:, 2:3]
    laplacian_u_y = d2u_y_dx2 + d2u_y_dy2 + d2u_y_dz2
    
    d2u_z_dx2 = torch.autograd.grad(du_dz[:, 0:1], coords, torch.ones_like(du_dz[:, 0:1]), create_graph=True, retain_graph=True)[0][:, 0:1]
    d2u_z_dy2 = torch.autograd.grad(du_dz[:, 1:2], coords, torch.ones_like(du_dz[:, 1:2]), create_graph=True, retain_graph=True)[0][:, 1:2]
    d2u_z_dz2 = torch.autograd.grad(du_dz[:, 2:3], coords, torch.ones_like(du_dz[:, 2:3]), create_graph=True, retain_graph=True)[0][:, 2:3]
    laplacian_u_z = d2u_z_dx2 + d2u_z_dy2 + d2u_z_dz2
    
    # Gradient of volumetric strain
    grad_vol_strain_x = torch.autograd.grad(volumetric_strain, coords, torch.ones_like(volumetric_strain), create_graph=True, retain_graph=True)[0][:, 0:1]
    grad_vol_strain_y = torch.autograd.grad(volumetric_strain, coords, torch.ones_like(volumetric_strain), create_graph=True, retain_graph=True)[0][:, 1:2]
    grad_vol_strain_z = torch.autograd.grad(volumetric_strain, coords, torch.ones_like(volumetric_strain), create_graph=True, retain_graph=True)[0][:, 2:3]
    
    # 3. Navier-Cauchy Equation: µ∇²u + (λ + µ)∇(∇·u) = 0 (Internal forces sum to zero in static equilibrium)
    residual_x = mu * laplacian_u_x + (lmbda + mu) * grad_vol_strain_x
    residual_y = mu * laplacian_u_y + (lmbda + mu) * grad_vol_strain_y
    residual_z = mu * laplacian_u_z + (lmbda + mu) * grad_vol_strain_z
    
    # The loss is the mean squared continuous residual
    physics_loss_val = (residual_x**2 + residual_y**2 + residual_z**2).mean()
    
    return physics_loss_val


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


class GradNormWeighting(nn.Module):
    """
    Implementation of GradNorm for dynamically weighing multiple loss components
    to ensure the network learns Physics and Data simultaneously.
    """
    def __init__(self, num_losses: int = 2, alpha: float = 0.12):
        super().__init__()
        # Initialize learnable weights for the losses (Data, Physics)
        self.weights = nn.Parameter(torch.ones(num_losses))
        self.alpha = alpha
        self.initial_losses = None
        
    def forward(self, losses: torch.Tensor) -> torch.Tensor:
        # Normalize weights
        num_losses = self.weights.shape[0]
        normalized_weights = num_losses * F.softmax(self.weights, dim=0)
        
        # Weighted loss
        weighted_loss = torch.sum(normalized_weights * losses)
        return weighted_loss
    
    def update_weights(self, current_losses: torch.Tensor, shared_layer_grad: torch.Tensor):
        num_losses = self.weights.shape[0]
        normalized_weights = num_losses * F.softmax(self.weights, dim=0)
        
        if self.initial_losses is None:
            self.initial_losses = current_losses.detach()
            
        # Compute loss ratio (current / initial) to see which task is training faster
        loss_ratios = current_losses.detach() / self.initial_losses
        inverse_training_rate = loss_ratios / loss_ratios.mean()
        
        # We want the gradient norms to match the inverse training rate
        constant_term = shared_layer_grad.mean().detach() * (inverse_training_rate ** self.alpha)
        
        # Calculate GradNorm loss
        grad_norm_loss = torch.sum(torch.abs(normalized_weights * shared_layer_grad - constant_term))
        
        return grad_norm_loss


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
        pred_output: Tuple[torch.Tensor, torch.Tensor, torch.Tensor],
        target_labels: torch.Tensor,
        coords: torch.Tensor,
        target_stiffness: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, dict, torch.Tensor]:
        """
        Args:
            pred_output: Tuple of (prediction, stiffness, displacement) from model
            target_labels: Ground truth labels (0 or 1)
            coords: Spatial coordinates for PDEs (B, 3)
            target_stiffness: Optional ground truth stiffness values
            
        Returns:
            Weighted total loss, dictionary of components, and a tensor of unweighted losses (for GradNorm)
        """
        prediction, stiffness, displacement = pred_output

        # ── Data loss ────────────────────────────────────────────────────────
        EPS = 1e-7
        pred_clamped = torch.clamp(prediction, min=EPS, max=1.0 - EPS)
        target_clamped = torch.clamp(target_labels.float(), min=0.0, max=1.0)
        
        bce = nn.BCELoss()
        data_loss = bce(pred_clamped, target_clamped)
        
        if target_stiffness is not None:
            stiffness_loss = self.mse(stiffness, target_stiffness)
            data_loss = data_loss + 0.5 * stiffness_loss
        
        # ── Physics constraint loss (Navier-Cauchy Equations) ────────────────
        if coords is not None and displacement is not None:
            phys_loss = navier_cauchy_residual(displacement, coords, stiffness, **self.physics_kwargs)
        else:
            # Fallback if spatial coordinates are missing
            phys_loss = torch.tensor(0.0).to(prediction.device)
        
        # Elasticity regularization (Bounds stiffness to 0-15 kPa)
        elastic_loss = elasticity_regularization(stiffness)
        
        # Total loss via simple weighting (Default behavior, overridable by GradNorm layer externally)
        total_loss = data_loss + self.lambda_physics * phys_loss + self.lambda_elastic * elastic_loss
        
        # Unweighted losses for dynamic GradNorm
        raw_losses = torch.stack([data_loss, phys_loss, elastic_loss])
        
        loss_dict = {
            'total': total_loss.item(),
            'data': data_loss.item(),
            'physics': phys_loss.item(),
            'elastic': elastic_loss.item()
        }
        
        return total_loss, loss_dict, raw_losses


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
