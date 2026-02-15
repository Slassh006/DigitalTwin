#!/bin/bash

# Endometriosis Digital Twin - Infrastructure Setup Script
# This script sets up the complete Kubernetes infrastructure

set -e  # Exit on error

echo "========================================"
echo "  EndoTwin Infrastructure Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're on Windows (Git Bash/WSL)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "${YELLOW}Detected Windows environment${NC}"
    USE_MINIKUBE=true
else
    USE_MINIKUBE=true
fi

# Step 1: Check for Kubernetes
echo "${YELLOW}[1/7] Checking Kubernetes availability...${NC}"
if kubectl version --client &> /dev/null; then
    echo "${GREEN}✓ kubectl found${NC}"
    
    # Check if cluster is running
    if kubectl cluster-info &> /dev/null; then
        echo "${GREEN}✓ Kubernetes cluster is running${NC}"
    else
        echo "${YELLOW}Kubernetes cluster not accessible. Starting Minikube...${NC}"
        
        # Check for Minikube
        if ! command -v minikube &> /dev/null; then
            echo "${RED}✗ Minikube not found. Please install: https://minikube.sigs.k8s.io/${NC}"
            exit 1
        fi
        
        # Start Minikube
        minikube start --cpus=4 --memory=8192 --disk-size=20g
        echo "${GREEN}✓ Minikube started${NC}"
    fi
else
    echo "${RED}✗ kubectl not found. Please install Kubernetes.${NC}"
    exit 1
fi

# Step 2: Build Docker images
echo ""
echo "${YELLOW}[2/7] Building Docker images...${NC}"

cd backend

# Use Minikube's Docker daemon if using Minikube
if [ "$USE_MINIKUBE" = true ]; then
    echo "${YELLOW}Using Minikube's Docker daemon...${NC}"
    eval $(minikube docker-env)
fi

# Build client image
echo "Building federated client image..."
docker build -f Dockerfile.client -t imaging-node:latest .
docker tag imaging-node:latest clinical-node:latest
docker tag imaging-node:latest pathology-node:latest
echo "${GREEN}✓ Client images built${NC}"

# Build PINN server image
echo "Building PINN server image..."
docker build -f Dockerfile.pinn -t pinn-server:latest .
echo "${GREEN}✓ PINN server image built${NC}"

cd ..

# Step 3: Create namespaces
echo ""
echo "${YELLOW}[3/7] Creating Kubernetes namespaces...${NC}"
kubectl apply -f k8s/namespaces.yaml
echo "${GREEN}✓ Namespaces created${NC}"

# Step 4: Deploy Imaging Node
echo ""
echo "${YELLOW}[4/7] Deploying Imaging Node...${NC}"
kubectl apply -f k8s/imaging-node/
kubectl wait --for=condition=available --timeout=120s deployment/imaging-node -n node-imaging || true
echo "${GREEN}✓ Imaging Node deployed${NC}"

# Step 5: Deploy Clinical Node
echo ""
echo "${YELLOW}[5/7] Deploying Clinical Node...${NC}"
kubectl apply -f k8s/clinical-node/
kubectl wait --for=condition=available --timeout=120s deployment/clinical-node -n node-clinical || true
echo "${GREEN}✓ Clinical Node deployed${NC}"

# Step 6: Deploy Pathology Node
echo ""
echo "${YELLOW}[6/7] Deploying Pathology Node...${NC}"
kubectl apply -f k8s/pathology-node/
kubectl wait --for=condition=available --timeout=120s deployment/pathology-node -n node-pathology || true
echo "${GREEN}✓ Pathology Node deployed${NC}"

# Step 7: Deploy PINN Server
echo ""
echo "${YELLOW}[7/7] Deploying PINN Server...${NC}"
kubectl apply -f k8s/pinn-server/
kubectl wait --for=condition=available --timeout=120s deployment/pinn-server -n central-pinn || true
echo "${GREEN}✓ PINN Server deployed${NC}"

# Summary
echo ""
echo "${GREEN}========================================"
echo "  Deployment Complete!"
echo "========================================${NC}"
echo ""
echo "To access the services, run port forwarding:"
echo ""
echo "  # Imaging Node"
echo "  kubectl port-forward -n node-imaging svc/imaging-service 8001:8000"
echo ""
echo "  # Clinical Node"
echo "  kubectl port-forward -n node-clinical svc/clinical-service 8002:8000"
echo ""
echo "  # Pathology Node"
echo "  kubectl port-forward -n node-pathology svc/pathology-service 8003:8000"
echo ""
echo "  # PINN Server"
echo "  kubectl port-forward -n central-pinn svc/pinn-service 8004:8000"
echo ""
echo "Check pod status:"
echo "  kubectl get pods --all-namespaces"
echo ""
echo "View logs:"
echo "  kubectl logs -n node-imaging deployment/imaging-node"
echo ""
