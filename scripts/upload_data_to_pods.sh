#!/bin/bash
set -e

echo "=========================================="
echo "    UPLOADING ORGANIZED DATA TO PODS      "
echo "=========================================="

# Ensure the user has run the python script to organize the datasets first
if [ ! -d "./backend/data/imaging" ] || [ ! -d "./backend/data/clinical" ] || [ ! -d "./backend/data/pathology" ]; then
    echo "ERROR: Local organized data not found in ./backend/data/"
    echo "Please run 'python scripts/organize_datasets.py' first."
    exit 1
fi

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l tier=federated-client -A --timeout=120s

# Function to copy data
copy_to_pods() {
    NODE_TYPE=$1
    NAMESPACE=$2
    LOCAL_DIR=$3

    echo "------------------------------------------"
    echo "Uploading to $NODE_TYPE nodes in namespace $NAMESPACE..."
    
    # Get all pods for this node type
    PODS=$(kubectl get pods -n $NAMESPACE -l app=$NODE_TYPE -o jsonpath='{.items[*].metadata.name}')
    
    if [ -z "$PODS" ]; then
        echo "No pods found for $NODE_TYPE."
        return
    fi
    
    for POD in $PODS; do
        echo "Copying data to pod: $POD..."
        # We tar the data first or just use kubectl cp
        # The target directory inside the pod is /app/data
        # Make sure directory exists
        kubectl exec -n $NAMESPACE $POD -- mkdir -p /app/data/
        # Copy the contents
        kubectl cp ${LOCAL_DIR}/. ${NAMESPACE}/${POD}:/app/data/
        echo "Successfully uploaded to $POD"
    done
}

# Upload imaging data
copy_to_pods "imaging-node" "node-imaging" "./backend/data/imaging"

# Upload clinical data
copy_to_pods "clinical-node" "node-clinical" "./backend/data/clinical"

# Upload pathology data
copy_to_pods "pathology-node" "node-pathology" "./backend/data/pathology"

# Assuming you might want to upload sensor data if the pod supports it
if [ -d "./backend/data/sensor" ]; then
    # if sensor-node exists, you do the same
    echo "Sensor data found, but no default Kubernetes pod configured for it yet."
fi

echo "=========================================="
echo "      DATA UPLOAD COMPLETE                "
echo "=========================================="
