"""
Variational Autoencoder (VAE) for Synthetic Patient Data Generation.

In medical datasets where Endometriosis patient records are sparse but
highly-dimensional, VAEs learn the underlying latent distribution of the
features (Clinical, Pathology, Imaging) to generate physically plausible
synthetic patients to combat class imbalance.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
import logging

logger = logging.getLogger(__name__)

class PatientVAE(nn.Module):
    def __init__(self, input_dim: int = 256, latent_dim: int = 32, hidden_dims: list = [128, 64]):
        """
        Architecture of the VAE.
        
        Args:
            input_dim: Total features (e.g. 128 Imaging + 64 Clinical + 64 Pathology = 256)
            latent_dim: Dimension of the compressed latent space.
            hidden_dims: Dimension array for Encoder/Decoder MLPs.
        """
        super().__init__()
        
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        
        # --- Encoder ---
        encoder_layers = []
        in_dim = input_dim
        for h_dim in hidden_dims:
            encoder_layers.extend([
                nn.Linear(in_dim, h_dim),
                nn.BatchNorm1d(h_dim),
                nn.LeakyReLU(0.2)
            ])
            in_dim = h_dim
            
        self.encoder = nn.Sequential(*encoder_layers)
        
        # Latent space parameters: mean and log variance
        self.fc_mu = nn.Linear(hidden_dims[-1], latent_dim)
        self.fc_logvar = nn.Linear(hidden_dims[-1], latent_dim)
        
        # --- Decoder ---
        decoder_layers = []
        hidden_dims_rev = list(reversed(hidden_dims))
        
        in_dim = latent_dim
        for h_dim in hidden_dims_rev:
            decoder_layers.extend([
                nn.Linear(in_dim, h_dim),
                nn.BatchNorm1d(h_dim),
                nn.LeakyReLU(0.2)
            ])
            in_dim = h_dim
            
        # Output layer maps back to original normalized feature space [0, 1]
        decoder_layers.extend([
            nn.Linear(in_dim, input_dim),
            nn.Sigmoid()
        ])
        
        self.decoder = nn.Sequential(*decoder_layers)
        
    def encode(self, x: torch.Tensor):
        """Encodes the input into mu and logvar."""
        h = self.encoder(x)
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar
        
    def reparameterize(self, mu: torch.Tensor, logvar: torch.Tensor):
        """
        The Reparameterization Trick to allow backpropagation through
        stochastic sampling. z = mu + epsilon * sigma
        """
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
        
    def decode(self, z: torch.Tensor):
        """Decodes latent vector z back to original feature dimensions."""
        return self.decoder(z)
        
    def forward(self, x: torch.Tensor):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        recon_x = self.decode(z)
        return recon_x, mu, logvar
        
    def generate_synthetic_samples(self, num_samples: int, device: torch.device) -> torch.Tensor:
        """
        Sample from the learned latent Normal distribution N(0, 1) and decode.
        
        Args:
            num_samples: How many synthetic patients to generate.
            device: CPU or CUDA.
        """
        self.eval()
        with torch.no_grad():
            z = torch.randn(num_samples, self.latent_dim).to(device)
            synthetic_features = self.decode(z)
        return synthetic_features

def vae_loss_function(recon_x, x, mu, logvar, beta=1.0):
    """
    Computes VAE Loss = Reconstruction Loss (MSE/BCE) + Beta * KL Divergence.
    
    Beta-VAE formulation allows us to tune how strictly we enforce N(0,1)
    on the latent space.
    """
    # Reconstruction loss (Assuming inputs are normalized 0-1)
    recon_loss = F.mse_loss(recon_x, x, reduction='sum')
    
    # KL Divergence: 0.5 * sum(1 + log(sigma^2) - mu^2 - sigma^2)
    kld_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    
    return (recon_loss + beta * kld_loss) / x.size(0) # Average over batch
