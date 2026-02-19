#!/bin/bash
set -e

# Configuration
PROJECT_ID="gen-lang-client-0526065945"
REGION="asia-south1"
REPO_NAME="digital-twin-repo"
IMAGE_ROOT="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

echo "=========================================="
echo "      DEPLOYING TO GKE                    "
echo "=========================================="

# Authenticate Docker to Artifact Registry
echo "Configuring Docker authentication..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# Function to build and push
build_and_push() {
    SERVICE_NAME=$1
    CONTEXT_DIR=$2
    DOCKERFILE=$3
    
    IMAGE_URI="$IMAGE_ROOT/$SERVICE_NAME:latest"
    
    echo "------------------------------------------"
    echo "Processing $SERVICE_NAME..."
    echo "Building $IMAGE_URI..."
    
    # Check if Dockerfile is specified, otherwise default to Dockerfile
    if [ -z "$DOCKERFILE" ]; then
        docker build -t $IMAGE_URI $CONTEXT_DIR
    else
        docker build -t $IMAGE_URI -f $DOCKERFILE $CONTEXT_DIR
    fi
    
    echo "Pushing $IMAGE_URI..."
    docker push $IMAGE_URI
    echo "$SERVICE_NAME pushed successfully."
}

# Build Backend Services
# These use custom Dockerfiles in the backend directory
build_and_push "imaging-node" "./backend" "./backend/Dockerfile.client"
build_and_push "clinical-node" "./backend" "./backend/Dockerfile.client"
build_and_push "pathology-node" "./backend" "./backend/Dockerfile.client"
build_and_push "pinn-server" "./backend" "./backend/Dockerfile.pinn"

# Build Frontend
build_and_push "frontend" "./frontend" ""

echo "=========================================="
echo "      APPLYING KUBERNETES MANIFESTS       "
echo "=========================================="

# We need to replace the image placeholders in our yaml files with the actual image URIs.
# For simplicity in this script, we'll assume the manifests might use a placeholder or 
# we can just rely on 'latest' tag matching what we pushed if the yamls are updated.

# Applying all manifests
echo "Applying manifests from ./k8s directory..."
kubectl apply -R -f ./k8s

echo "=========================================="
echo "      DEPLOYMENT TRIGGERED                "
echo "=========================================="
echo "Monitor status with: kubectl get pods -A"
echo "Get External IPs with: kubectl get services"
