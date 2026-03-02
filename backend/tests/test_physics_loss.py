import pytest
import torch
import torch.nn as nn
from backend.utils.physics_loss import navier_cauchy_residual

def test_navier_cauchy_static_equilibrium():
    """
    Tests the Navier-Cauchy residual for a known static equilibrium state.
    If displacement (u) is zero everywhere, the spatial derivatives should be zero,
    and the physical residual must evaluate to strictly 0.0.
    """
    batch_size = 5
    # Create coordinate tensor with requires_grad=True
    coords = torch.rand((batch_size, 3), requires_grad=True)
    
    # Static equilibrium: displacement is zero
    # We use a dummy model that outputs zero displacement
    class ZeroDisplacementModel(nn.Module):
        def forward(self, x):
            return torch.zeros_like(x)
    
    model = ZeroDisplacementModel()
    displacement = model(coords)
    
    # Constant Young's Modulus (e.g., 5.0 kPa)
    youngs_modulus = torch.full((batch_size, 1), 5.0, requires_grad=True)
    
    # Calculate residual
    residual = navier_cauchy_residual(
        displacement=displacement,
        coords=coords,
        youngs_modulus=youngs_modulus,
        poisson_ratio=0.49 # nearly incompressible tissue
    )
    
    # In perfect static non-displaced equilibrium, the residual should be extremely close to 0
    assert torch.allclose(residual, torch.zeros_like(residual), atol=1e-6), "Residual is non-zero for static state"

def test_navier_cauchy_linear_displacement():
    """
    Tests the behavior under a linear displacement field.
    Since Navier-Cauchy relies on second derivatives (Laplacian), 
    the second derivatives of a linear field are zero, so residual should still be zero
    if body forces are zero.
    """
    batch_size = 5
    coords = torch.rand((batch_size, 3), requires_grad=True)
    
    # Linear displacement: u_x = a*x, u_y = b*y, u_z = c*z
    # First derivatives are constant, second derivatives are exactly 0.
    a, b, c = 0.1, -0.2, 0.05
    displacement = torch.stack([
        coords[:, 0] * a,
        coords[:, 1] * b,
        coords[:, 2] * c
    ], dim=1)
    
    youngs_modulus = torch.full((batch_size, 1), 5.0)
    
    residual = navier_cauchy_residual(
        displacement=displacement,
        coords=coords,
        youngs_modulus=youngs_modulus,
        poisson_ratio=0.49
    )
    
    assert torch.allclose(residual, torch.zeros_like(residual), atol=1e-5), "Linear displacement should yield zero residual"

if __name__ == "__main__":
    pytest.main(["-v", __file__])
