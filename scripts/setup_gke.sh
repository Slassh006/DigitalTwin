#!/bin/bash
set -e

# Configuration
PROJECT_ID="gen-lang-client-0526065945"
REGION="asia-south1"
CLUSTER_NAME="endotwin-cluster"
REPO_NAME="digital-twin-repo"

echo "=========================================="
echo "      GKE SETUP FOR DIGITAL TWIN          "
echo "=========================================="

echo "[1/4] Setting local gcloud project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "[2/4] Enabling required Google Cloud APIs..."
gcloud services enable container.googleapis.com artifactregistry.googleapis.com
echo "APIs enabled."

echo "[3/4] Checking/Creating Artifact Registry Repository..."
if gcloud artifacts repositories describe $REPO_NAME --location=$REGION &> /dev/null; then
    echo "Repository $REPO_NAME already exists."
else
    echo "Creating repository $REPO_NAME..."
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for Digital Twin"
    echo "Repository created."
fi

echo "[4/4] Checking/Creating GKE Autopilot Cluster..."
# Autopilot is recommended for hands-off management
if gcloud container clusters describe $CLUSTER_NAME --region=$REGION &> /dev/null; then
    echo "Cluster $CLUSTER_NAME already exists."
else
    echo "Creating Autopilot cluster $CLUSTER_NAME (this may take 10-15 minutes)..."
    gcloud container clusters create-auto $CLUSTER_NAME \
        --region=$REGION \
        --release-channel=regular
    echo "Cluster created."
fi

echo "=========================================="
echo "Fetching cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

echo "Setup Complete! You are now connected to $CLUSTER_NAME."
