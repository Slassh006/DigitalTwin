# Windows PowerShell Deployment Commands

## Quick Start (PowerShell)

```powershell
# Navigate to frontend directory
cd H:\Akash\DigitalTwin\frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## Full Deployment (PowerShell)

### Step 1: Setup Kubernetes (if using Minikube)

```powershell
# Start Minikube
minikube start --cpus=4 --memory=8192 --disk-size=20g

# Use Minikube's Docker daemon
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
```

### Step 2: Build Docker Images

```powershell
cd H:\Akash\DigitalTwin\backend

# Build client image
docker build -f Dockerfile.client -t imaging-node:latest .
docker tag imaging-node:latest clinical-node:latest
docker tag imaging-node:latest pathology-node:latest

# Build PINN server image
docker build -f Dockerfile.pinn -t pinn-server:latest .

cd ..
```

### Step 3: Deploy to Kubernetes

```powershell
# Create namespaces
kubectl apply -f k8s/namespaces.yaml

# Deploy all services
kubectl apply -f k8s/imaging-node/
kubectl apply -f k8s/clinical-node/
kubectl apply -f k8s/pathology-node/
kubectl apply -f k8s/pinn-server/

# Wait for pods to be ready
kubectl get pods --all-namespaces -w
```

### Step 4: Port Forwarding (4 Separate PowerShell Windows)

**Window 1:**
```powershell
kubectl port-forward -n node-imaging svc/imaging-service 8001:8000
```

**Window 2:**
```powershell
kubectl port-forward -n node-clinical svc/clinical-service 8002:8000
```

**Window 3:**
```powershell
kubectl port-forward -n node-pathology svc/pathology-service 8003:8000
```

**Window 4:**
```powershell
kubectl port-forward -n central-pinn svc/pinn-service 8004:8000
```

### Step 5: Start Frontend

**New PowerShell Window:**
```powershell
cd H:\Akash\DigitalTwin\frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

## Troubleshooting

### Command Not Found Errors

If you see "The token '&&' is not a valid statement separator":
- **DON'T USE**: `cd frontend && npm install` (Bash syntax)
- **USE**: Run commands separately or use semicolons:
  ```powershell
  cd frontend; npm install; npm run dev
  ```

### Docker Build Fails

Ensure you're using Minikube's Docker:
```powershell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
```

### Pod Not Starting

Check logs:
```powershell
kubectl logs -n node-imaging deployment/imaging-node
kubectl describe pod -n node-imaging <pod-name>
```

### Port Already in Use

Kill the process:
```powershell
# Find process using port 8001
netstat -ano | findstr :8001

# Kill process (replace <PID> with actual PID)
taskkill /PID <PID> /F
```

## Verification Commands

```powershell
# Check all pods
kubectl get pods --all-namespaces

# Check services
kubectl get svc --all-namespaces

# Check logs
kubectl logs -n central-pinn deployment/pinn-server

# Open Kubernetes dashboard
minikube dashboard
```

## Quick Restart

```powershell
# Delete all deployments
kubectl delete -f k8s/imaging-node/
kubectl delete -f k8s/clinical-node/
kubectl delete -f k8s/pathology-node/
kubectl delete -f k8s/pinn-server/

# Redeploy
kubectl apply -f k8s/imaging-node/
kubectl apply -f k8s/clinical-node/
kubectl apply -f k8s/pathology-node/
kubectl apply -f k8s/pinn-server/
```
