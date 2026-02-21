#!/bin/bash
# =============================================================
#  EndoTwin - Full AWS EC2 Ubuntu Auto-Setup & Deploy Script
#  Run this ONCE on a fresh Ubuntu EC2 instance to set up the
#  complete Kubernetes environment and deploy all services.
#
#  Usage:
#    ssh ubuntu@<EC2_IP>
#    git clone <your-repo-url> DigitalTwin && cd DigitalTwin
#    chmod +x scripts/ec2_full_setup.sh
#    ./scripts/ec2_full_setup.sh
# =============================================================
set -e

REGISTRY="localhost:32000"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="/tmp/endotwin_setup.log"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
success() { echo "✅  $1" | tee -a "$LOG_FILE"; }
error() { echo "❌  $1" | tee -a "$LOG_FILE"; exit 1; }
warn() { echo "⚠️   $1" | tee -a "$LOG_FILE"; }

log "=========================================="
log "  EndoTwin - EC2 Full Environment Setup  "
log "=========================================="
log "Project directory: $PROJECT_DIR"

# ============================================================
# PHASE 1: System Dependencies
# ============================================================
log ""
log "--- PHASE 1: Installing System Dependencies ---"

log "Updating apt..."
sudo apt-get update -qq

# Install Docker if not present
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh
    sudo usermod -aG docker $USER
    success "Docker installed."
else
    success "Docker already installed: $(docker --version)"
fi

# Install snapd if not present
if ! command -v snap &>/dev/null; then
    log "Installing snapd..."
    sudo apt-get install -y -qq snapd
fi

# ============================================================
# PHASE 2: MicroK8s Setup
# ============================================================
log ""
log "--- PHASE 2: Installing MicroK8s ---"

if ! command -v microk8s &>/dev/null; then
    log "Installing MicroK8s 1.30..."
    sudo snap install microk8s --classic --channel=1.30/stable
    success "MicroK8s installed."
else
    success "MicroK8s already installed."
fi

# Permissions
sudo usermod -a -G microk8s $USER
sudo chown -f -R $USER ~/.kube 2>/dev/null || true

log "Waiting for MicroK8s to be ready (up to 3 min)..."
sudo microk8s status --wait-ready --timeout=180

log "Enabling required addons..."
sudo microk8s enable dns storage ingress registry dashboard

# GPU support (optional)
if command -v nvidia-smi &>/dev/null; then
    log "NVIDIA GPU detected — enabling GPU addon..."
    sudo microk8s enable gpu
    success "GPU support enabled."
else
    warn "No NVIDIA GPU detected. Skipping GPU support."
fi

# Configure insecure local registry for Docker
DAEMON_JSON="/etc/docker/daemon.json"
if ! grep -q "localhost:32000" "$DAEMON_JSON" 2>/dev/null; then
    log "Configuring Docker to trust local MicroK8s registry..."
    if [ -f "$DAEMON_JSON" ]; then
        # Merge into existing file using Python to safely edit JSON
        sudo python3 -c "
import json, sys
with open('$DAEMON_JSON') as f:
    d = json.load(f)
d.setdefault('insecure-registries', [])
if 'localhost:32000' not in d['insecure-registries']:
    d['insecure-registries'].append('localhost:32000')
with open('$DAEMON_JSON', 'w') as f:
    json.dump(d, f, indent=2)
"
    else
        echo '{ "insecure-registries": ["localhost:32000"] }' | sudo tee "$DAEMON_JSON"
    fi
    sudo systemctl restart docker
    success "Docker configured for local registry."
fi

# kubectl alias
if ! grep -q "alias kubectl='microk8s kubectl'" ~/.bash_aliases 2>/dev/null; then
    echo "alias kubectl='microk8s kubectl'" >> ~/.bash_aliases
fi
# Make kubectl available immediately in this session
shopt -s expand_aliases
alias kubectl="sudo microk8s kubectl"

success "MicroK8s is ready."

# ============================================================
# PHASE 3: Python & Dataset Organization
# ============================================================
log ""
log "--- PHASE 3: Setting up Python & Organizing Datasets ---"

if ! command -v python3 &>/dev/null; then
    sudo apt-get install -y -qq python3 python3-pip
fi

pip3 install -q pandas openpyxl

DATASET_SRC="$PROJECT_DIR/datasets"
if [ -d "$DATASET_SRC" ]; then
    log "Running dataset organizer..."
    python3 "$PROJECT_DIR/scripts/organize_datasets.py"
    success "Datasets organized into backend/data/"
else
    warn "datasets/ folder not found. Skipping dataset organization."
    warn "Run 'python3 scripts/organize_datasets.py' after uploading your datasets."
fi

# ============================================================
# PHASE 4: Build Docker Images
# ============================================================
log ""
log "--- PHASE 4: Building and Pushing Docker Images ---"

cd "$PROJECT_DIR"

# Wait for local registry to be ready
log "Checking local registry availability..."
for i in $(seq 1 15); do
    if curl --max-time 2 -s http://$REGISTRY/v2/ &>/dev/null; then
        success "Local registry is online at $REGISTRY"
        break
    fi
    warn "Registry not ready yet ($i/15). Waiting 10s..."
    sleep 10
done
curl --max-time 2 -s http://$REGISTRY/v2/ &>/dev/null || error "Local registry unreachable after 150s."

build_and_push() {
    SERVICE=$1
    CONTEXT=$2
    DOCKERFILE=$3
    IMAGE="$REGISTRY/$SERVICE:latest"
    
    log "Building $SERVICE..."
    if [ -z "$DOCKERFILE" ]; then
        docker build -t "$IMAGE" "$CONTEXT" 2>&1 | tail -5
    else
        docker build -t "$IMAGE" -f "$DOCKERFILE" "$CONTEXT" 2>&1 | tail -5
    fi
    docker push "$IMAGE"
    success "$SERVICE → $IMAGE"
}

build_and_push "imaging-node"   "./backend"   "./backend/Dockerfile.client"
build_and_push "clinical-node"  "./backend"   "./backend/Dockerfile.client"
build_and_push "pathology-node" "./backend"   "./backend/Dockerfile.client"
build_and_push "pinn-server"    "./backend"   "./backend/Dockerfile.pinn"
build_and_push "frontend"       "./frontend"  ""

# ============================================================
# PHASE 5: Apply Kubernetes Manifests
# ============================================================
log ""
log "--- PHASE 5: Applying Kubernetes Manifests ---"

apply_with_local_image() {
    FILE=$1
    SERVICE=$2
    sed "s|image: .*|image: $REGISTRY/$SERVICE:latest|g" "$FILE" | sudo microk8s kubectl apply -f -
}

# Namespaces first
sudo microk8s kubectl apply -f k8s/namespaces.yaml
sudo microk8s kubectl apply -f k8s/frontend/namespace.yaml

# PVCs
sudo microk8s kubectl apply -f k8s/imaging-node/pvc.yaml
sudo microk8s kubectl apply -f k8s/clinical-node/pvc.yaml
sudo microk8s kubectl apply -f k8s/pathology-node/pvc.yaml
sudo microk8s kubectl apply -f k8s/pinn-server/pvc.yaml

# Services
find k8s -name "service.yaml" -exec sudo microk8s kubectl apply -f {} \;

# Deployments (with local registry image URLs injected)
apply_with_local_image k8s/imaging-node/deployment.yaml   "imaging-node"
apply_with_local_image k8s/clinical-node/deployment.yaml  "clinical-node"
apply_with_local_image k8s/pathology-node/deployment.yaml "pathology-node"
apply_with_local_image k8s/pinn-server/deployment.yaml    "pinn-server"
apply_with_local_image k8s/frontend/deployment.yaml       "frontend"

success "All Kubernetes manifests applied."

# ============================================================
# PHASE 6: Upload Datasets into Live Pods
# ============================================================
log ""
log "--- PHASE 6: Uploading Organized Datasets into Pods ---"

log "Waiting for federated client pods to be ready (up to 3 min)..."
sudo microk8s kubectl wait --for=condition=ready pod \
    -l tier=federated-client -A \
    --timeout=180s 2>/dev/null || warn "Some pods took too long. Trying data upload anyway..."

upload_to_pods() {
    NODE_TYPE=$1
    NAMESPACE=$2
    LOCAL_DIR=$3

    if [ ! -d "$LOCAL_DIR" ]; then
        warn "Local data dir not found: $LOCAL_DIR. Skipping."
        return
    fi

    PODS=$(sudo microk8s kubectl get pods -n "$NAMESPACE" -l "app=$NODE_TYPE" \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)

    if [ -z "$PODS" ]; then
        warn "No pods found for $NODE_TYPE in $NAMESPACE."
        return
    fi

    for POD in $PODS; do
        log "  Uploading to $NAMESPACE/$POD..."
        sudo microk8s kubectl exec -n "$NAMESPACE" "$POD" -- mkdir -p /app/data/ 2>/dev/null || true
        sudo microk8s kubectl cp "$LOCAL_DIR/." "${NAMESPACE}/${POD}:/app/data/"
        success "  Data uploaded to $POD"
    done
}

upload_to_pods "imaging-node"   "node-imaging"   "$PROJECT_DIR/backend/data/imaging"
upload_to_pods "clinical-node"  "node-clinical"  "$PROJECT_DIR/backend/data/clinical"
upload_to_pods "pathology-node" "node-pathology" "$PROJECT_DIR/backend/data/pathology"

# ============================================================
# PHASE 7: Status Summary
# ============================================================
log ""
log "=========================================="
log "      ENDOTWIN DEPLOYMENT COMPLETE       "
log "=========================================="

sudo microk8s kubectl get pods -A

log ""
log "📡 Getting service endpoints..."
FRONTEND_IP=$(sudo microk8s kubectl get svc frontend-service -n frontend \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")
EC2_PUBLIC_IP=$(curl -s --max-time 3 \
    http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "Unknown")

log ""
success "Frontend URL: http://$EC2_PUBLIC_IP:3000  (or http://$FRONTEND_IP)"
log ""
log "Useful commands:"
log "  sudo microk8s kubectl get pods -A"
log "  sudo microk8s kubectl get svc -A"
log "  sudo microk8s kubectl logs -n central-pinn deployment/pinn-server"
log "  sudo microk8s kubectl logs -n node-imaging deployment/imaging-node"
log ""
log "IMPORTANT: Log out and log back in to apply docker+microk8s group changes."
log "           Then you won't need 'sudo' for kubectl commands."
log "Setup log saved to: $LOG_FILE"
