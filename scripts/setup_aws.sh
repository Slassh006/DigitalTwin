#!/bin/bash
set -e

echo "=========================================="
echo "      MICROK8S SETUP (AWS EC2)            "
echo "=========================================="

# 1. Check for existing Docker installation
if command -v docker &> /dev/null; then
    echo "Docker is already installed. Skipping installation."
else
    echo "Docker not found. Installing..."
    # Use official script to avoid granular package conflicts on AMIs
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Add user to docker group
sudo usermod -aG docker $USER

# 2. Install MicroK8s
echo "Installing MicroK8s..."
sudo snap install microk8s --classic --channel=1.30/stable

# 3. Configure permissions
echo "Configuring permissions..."
sudo usermod -a -G microk8s $USER
sudo chown -f -R $USER ~/.kube

# 4. Enable addons
echo "Enabling addons..."
sudo microk8s status --wait-ready
sudo microk8s enable dns storage ingress registry dashboard

# Check for GPU (NVIDIA)
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected. Enabling GPU support..."
    sudo microk8s enable gpu
else
    echo "No NVIDIA GPU detected. Skipping GPU support."
fi

# Configure Docker to trust MicroK8s registry
if [ ! -f /etc/docker/daemon.json ]; then
    echo "Configuring Docker insecure registry for localhost:32000..."
    echo '{ "insecure-registries" : ["localhost:32000"] }' | sudo tee /etc/docker/daemon.json
    sudo systemctl restart docker
else
    echo "Checking Docker config for insecure registry..."
    if ! grep -q "localhost:32000" /etc/docker/daemon.json; then
        # This is a bit risky to sed automatically without parsing json, but for a fresh Setup usually ok.
        # Safer to just warn user or append if simple. 
        # For now, let's assume if it exists, the user knows what they are doing or we let it fail push and they fix it.
        echo "WARNING: /etc/docker/daemon.json exists. Ensure 'localhost:32000' is in 'insecure-registries' to push images."
    fi
fi

# 5. Alias kubectl
echo "Setting up kubectl alias..."
if ! grep -q "alias kubectl='microk8s kubectl'" ~/.bash_aliases; then
    echo "alias kubectl='microk8s kubectl'" >> ~/.bash_aliases
fi
source ~/.bash_aliases || true

echo "=========================================="
echo "      SETUP COMPLETE                      "
echo "=========================================="
echo "IMPORTANT: Log out and log back in to apply group changes!"
