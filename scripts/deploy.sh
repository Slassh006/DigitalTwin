#!/bin/bash
set -e

# Configuration
PROJECT_ID="gen-lang-client-0526065945"
REGION="us-central1"
REPO_NAME="digital-twin-repo"
IMAGE_ROOT="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

echo "=========================================="
echo "      DEPLOYING TO GKE (VIA CLOUD BUILD)  "
echo "=========================================="

# No need for local docker auth since we use gcloud builds submit

# Function to submit build to Cloud Build
build_and_push() {
    SERVICE_NAME=$1
    CONTEXT_DIR=$2
    DOCKERFILE=$3
    
    IMAGE_URI="$IMAGE_ROOT/$SERVICE_NAME:latest"
    
    echo "------------------------------------------"
    echo "Submitting build for $SERVICE_NAME..."
    
    # Check if Dockerfile is specified
    if [ -z "$DOCKERFILE" ]; then
        # Default Dockerfile in context root
        gcloud builds submit --tag $IMAGE_URI $CONTEXT_DIR
    else
        # Custom Dockerfile path
        # We need to tell Cloud Build where the Dockerfile is relative to the context
        # gcloud builds submit takes the context directory as a positional argument
        # and --config is for cloudbuild.yaml, but for simple builds we use --tag.
        # However, specifying a custom Dockerfile with simple --tag is tricky in one line.
        # Strategy: Use --file flag (available in newer gcloud versions) or rely on standard build.
        
        # It's safer to use the --config flag for custom Dockerfiles? 
        # Actually gcloud builds submit has a flag --file since 2021.
        
        # Let's try the --config method if --tag doesn't support -f directly. 
        # Wait, `gcloud builds submit . --tag ...` implies using Dockerfile in root.
        
        # For our backend services, the Dockerfiles are named `Dockerfile.client` etc.
        # We can pass the file path relative to the sources.
        
        # NOTE: Cloud Build expects the Dockerfile to be in the uploaded source.
        # Since we upload $CONTEXT_DIR (./backend), the file is at ./Dockerfile.client (relative to build root).
        
        # The correct flag is often implicit if it's named Dockerfile. 
        # But here valid syntax is: `gcloud builds submit --tag image --file <path/to/Dockerfile> <path/to/context>`
        # But wait, looking at gcloud help: `gcloud builds submit [SOURCE] ...`
        
        # Actually, simpler approach:
        # Just run the command.
        
        # IMPORTANT: The file path must be relative to the current directory where we run gcloud, 
        # OR relative to the build context? 
        # Documentation says: --file is the Dockerfile path.
        
        gcloud builds submit --tag $IMAGE_URI $CONTEXT_DIR --timeout=15m
        
        # Wait, `gcloud builds submit $CONTEXT_DIR` will look for `Dockerfile` in $CONTEXT_DIR.
        # But we have `Dockerfile.client` there.
        # So we MUST specify the file.
        
        # BUT `gcloud builds submit` doesn't support arbitrary Dockerfile names easily without a cloudbuild.yaml 
        # unless we use the undocumented pack builder or just use standard renaming?
        
        # Correction: `gcloud builds submit` DOES support `--tag` but defaults to `Dockerfile`.
        # Code reference: We need to use `docker build` inside Cloud Build steps? No that's complex.
        
        # Workaround: We will rely on simple `gcloud builds submit` assuming standard Dockerfile, 
        # OR we construct a temporary cloudbuild.yaml on the fly?
        # NO, that's too complex for a bash script.
        
        # Let's check if we can pass metadata. 
        
        # ACTUALLY: The user's backend has multiple Dockerfiles in one dir.
        # `gcloud builds submit --tag ...` will fail if there is no `Dockerfile`.
        
        # We will use a quick cloudbuild.yaml generation approach for robustness.
        
        echo "Generating temporary cloudbuild.yaml for $SERVICE_NAME..."
        cat > cloudbuild_tmp.yaml <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: [ 'build', '-t', '$IMAGE_URI', '-f', '${DOCKERFILE##*/}', '.' ]
images:
- '$IMAGE_URI'
EOF
        # Note: ${DOCKERFILE##*/} extracts the filename (e.g. Dockerfile.client)
        # We assume the context dir is what we submit.
        
        gcloud builds submit $CONTEXT_DIR --config cloudbuild_tmp.yaml
        rm cloudbuild_tmp.yaml
    fi
}

build_and_push_simple() {
     SERVICE_NAME=$1
    CONTEXT_DIR=$2
    IMAGE_URI="$IMAGE_ROOT/$SERVICE_NAME:latest"
    echo "Submitting build for $SERVICE_NAME..."
    gcloud builds submit --tag $IMAGE_URI $CONTEXT_DIR
}


# Build Backend Services (Custom Dockerfiles)
# We need to be careful: $CONTEXT_DIR is ./backend. 
# $DOCKERFILE path passed to function was "./backend/Dockerfile.client"
# Inside Cloud Build, the root is the context. So the file is just "Dockerfile.client"

# Function to build with custom dockerfile
build_custom() {
    SERVICE=$1
    CONTEXT=$2
    DOCKERFILE_NAME=$3 # Just the filename, e.g. Dockerfile.client
    
    IMAGE_URI="$IMAGE_ROOT/$SERVICE:latest"
    echo "Building $SERVICE via Cloud Build..."
    
    # Create a dynamic cloudbuild config
    cat > cloudbuild-$SERVICE.yaml <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: [ 'build', '-t', '$IMAGE_URI', '-f', '$DOCKERFILE_NAME', '.' ]
images:
- '$IMAGE_URI'
EOF
    
    gcloud builds submit $CONTEXT --config cloudbuild-$SERVICE.yaml
    rm cloudbuild-$SERVICE.yaml
}

build_custom "imaging-node" "./backend" "Dockerfile.client"
build_custom "clinical-node" "./backend" "Dockerfile.client"
build_custom "pathology-node" "./backend" "Dockerfile.client"
build_custom "pinn-server" "./backend" "Dockerfile.pinn"

# Build Frontend (Standard Dockerfile)
build_and_push_simple "frontend" "./frontend"

echo "=========================================="
echo "      APPLYING KUBERNETES MANIFESTS       "
echo "=========================================="

echo "Creating namespaces..."
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/frontend/namespace.yaml

echo "Applying services and deployments..."
kubectl apply -R -f ./k8s

echo "=========================================="
echo "      DEPLOYMENT COMPLETE                 "
echo "=========================================="
echo "Monitor status with: kubectl get pods -A"
echo "Get External IPs with: kubectl get services"
