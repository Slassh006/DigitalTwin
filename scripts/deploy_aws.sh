#!/bin/bash
set -e

REGISTRY="localhost:32000"
echo "=========================================="
echo "      DEPLOYING TO AWS (MICROK8S)         "
echo "=========================================="

# Pre-flight check: Is Registry running?
echo "Checking registry status..."
if ! curl --max-time 2 -s http://localhost:32000/v2/ &> /dev/null; then
    echo "❌ ERROR: Local registry (localhost:32000) is NOT reachable."
    echo "   The 'registry' addon is probably not enabled."
    echo "   👉 Please run: ./scripts/setup_aws.sh"
    exit 1
fi
echo "✅ Registry is online."

build_and_push() {
    SERVICE=$1
    CONTEXT=$2
    DOCKERFILE=$3
    IMAGE="$REGISTRY/$SERVICE:latest"
    
    echo "Processing $SERVICE..."
    if [ -z "$DOCKERFILE" ]; then
        docker build -t $IMAGE $CONTEXT
    else
        docker build -t $IMAGE -f $DOCKERFILE $CONTEXT
    fi
    docker push $IMAGE
}

# 1. Build and Push to Local Registry
build_and_push "imaging-node" "./backend" "./backend/Dockerfile.client"
build_and_push "clinical-node" "./backend" "./backend/Dockerfile.client"
build_and_push "pathology-node" "./backend" "./backend/Dockerfile.client"
build_and_push "pinn-server" "./backend" "./backend/Dockerfile.pinn"
build_and_push "frontend" "./frontend" ""

# 2. Update Manifests (On the fly) & Apply
echo "Applying Manifests..."

# Ensure namespaces exist
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/frontend/namespace.yaml

# Function to apply with image replacement
apply_with_replace() {
    FILE=$1
    SERVICE_NAME=$2
    # Replace any existing image URL with our local registry URL
    # We use sed to replace the 'image: .*' line
    sed "s|image: .*|image: $REGISTRY/$SERVICE_NAME:latest|g" $FILE | kubectl apply -f -
}

# Apply Backends
apply_with_replace k8s/pinn-server/deployment.yaml "pinn-server"
apply_with_replace k8s/imaging-node/deployment.yaml "imaging-node"
apply_with_replace k8s/clinical-node/deployment.yaml "clinical-node"
apply_with_replace k8s/pathology-node/deployment.yaml "pathology-node"
apply_with_replace k8s/frontend/deployment.yaml "frontend"

# Apply Services (Standard apply)
kubectl apply -f k8s/frontend/service.yaml
# (And any other service files in k8s/ subdirs if they aren't included in deployment.yaml)
# To be safe, let's re-apply the whole directory recursively? 
# No, that would overwrite our image changes in deployments.
# We manually applied deployments, so we just need services.
# Let's just find and apply services.
find k8s -name "service.yaml" -exec kubectl apply -f {} \;

echo "=========================================="
echo "      DEPLOYMENT COMPLETE                 "
echo "=========================================="
echo "Check status: kubectl get pods -A"
