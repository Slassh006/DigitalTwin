#!/bin/bash
set -e

echo "=========================================="
echo "      MICROK8S SETUP (AWS EC2)            "
echo "=========================================="

# 1. Update and install prerequisites
echo "Updating packages..."
sudo apt-get update
sudo apt-get install -y docker.io

# 2. Install MicroK8s
echo "Installing MicroK8s..."
sudo snap install microk8s --classic --channel=1.30/stable

# 3. Configure permissions
echo "Configuring permissions..."
sudo usermod -a -G microk8s $USER
sudo chown -f -R $USER ~/.kube

# 4. Enable addons
echo "Enabling addons..."
microk8s status --wait-ready
microk8s enable dns storage ingress registry dashboard

# Check for GPU (NVIDIA)
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected. Enabling GPU support..."
    microk8s enable gpu
else
    echo "No NVIDIA GPU detected. Skipping GPU support."
fi

# 5. Alias kubectl
echo "Setting up kubectl alias..."
echo "alias kubectl='microk8s kubectl'" >> ~/.bash_aliases
source ~/.bash_aliases

echo "=========================================="
echo "      SETUP COMPLETE                      "
echo "=========================================="
echo "Please run: 'newgrp microk8s' to refresh your group membership."
echo "Then verify with: 'kubectl get nodes'"
