# Getting Started with the Endometriosis Digital Twin

## Prerequisites

Before you begin, ensure you have:
- **Docker Desktop** with Kubernetes enabled OR **Minikube** installed
- **Python 3.9+**
- **Node.js 18+**
- **npm** or **yarn**

## Step 1: Prepare Your Data

Place your datasets in the following structure:

```
H:/Akash/DigitalTwin/data/
├── imaging/
│   └── patient_001.nii  # Your NIfTI MRI files
├── clinical/
│   └── records.csv      # Clinical patient records
├── pathology/
│   └── lab_reports.csv  # Pathology lab reports
└── labels/
    └── annotations.csv  # Ground truth labels
```

**Note:** The system includes mock data generators, so it will work even if you don't have the actual data files yet!

## Step 2: Deploy the Backend (Kubernetes)

### Using the Automated Script (Recommended)

```bash
cd H:/Akash/DigitalTwin
bash setup_infrastructure.sh
```

This script will:
1. Start Minikube (if needed)
2. Build all Docker images
3. Create Kubernetes namespaces
4. Deploy all 4 services

### Manual Deployment

If the script doesn't work, follow these steps:

```bash
# 1. Start Minikube
minikube start --cpus=4 --memory=8192

# 2. Use Minikube's Docker daemon
eval $(minikube docker-env)

# 3. Build images
cd backend
docker build -f Dockerfile.client -t imaging-node:latest .
docker tag imaging-node:latest clinical-node:latest
docker tag imaging-node:latest pathology-node:latest
docker build -f Dockerfile.pinn -t pinn-server:latest .

# 4. Apply Kubernetes manifests
cd ..
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/imaging-node/
kubectl apply -f k8s/clinical-node/
kubectl apply -f k8s/pathology-node/
kubectl apply -f k8s/pinn-server/

# 5. Wait for pods to be ready
kubectl get pods --all-namespaces -w
```

### Set Up Port Forwarding

Open **4 separate terminals** and run:

```bash
# Terminal 1 - Imaging Node
kubectl port-forward -n node-imaging svc/imaging-service 8001:8000

# Terminal 2 - Clinical Node
kubectl port-forward -n node-clinical svc/clinical-service 8002:8000

# Terminal 3 - Pathology Node
kubectl port-forward -n node-pathology svc/pathology-service 8003:8000

# Terminal 4 - PINN Server
kubectl port-forward -n central-pinn svc/pinn-service 8004:8000
```

## Step 3: Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at: **http://localhost:3000**

## Step 4: Using the System

### 1. Train the Federated Nodes

- Navigate to the **Dashboard** page
- Click **"Start Training"**
- Watch the training progress in real-time

### 2. Generate Predictions

- Navigate to the **Simulation** page
- Click **"Simulate"**
- The 3D uterus model will update with color-coded stiffness

### 3. Interpret Results

- **Green**: Healthy tissue (<2 kPa)
- **Yellow**: Moderate stiffness (2-5 kPa)
- **Red**: Endometriosis risk (>5 kPa)

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods --all-namespaces

# View logs
kubectl logs -n node-imaging deployment/imaging-node

# Describe pod for errors
kubectl describe pod -n node-imaging <pod-name>
```

### Frontend Can't Connect to Backend

1. Ensure port forwarding is running
2. Check that all services are healthy:
   ```bash
   kubectl get svc --all-namespaces
   ```
3. Verify the API URL in `frontend/lib/api.ts` matches your port forwarding

### Docker Build Fails

If using Minikube:
```bash
eval $(minikube docker-env)
```

Then rebuild the images.

## Next Steps

- Add your real MRI data to `data/imaging/`
- Customize clinical features in `backend/clients/client_clinical.py`
- Adjust PINN architecture in `backend/pinn_server/model.py`

## Support

For issues or questions, please check:
- Kubernetes dashboard: `minikube dashboard`
- Backend logs: `kubectl logs -n <namespace> <service>`
- Frontend console: Browser DevTools

---

**Congratulations!** You now have a complete federated learning system running! 🎉
