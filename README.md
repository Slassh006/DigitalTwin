# Endometriosis Digital Twin 🏥

A federated learning system for endometriosis prediction using Physics-Informed Neural Networks (PINNs), deployed on Kubernetes with 3D visualization.

## 🎯 System Overview

**Architecture:**
- **3 Federated Data Nodes**: Imaging (MRI), Clinical (Patient Records), Pathology (Lab Reports)
- **1 Central PINN Server**: Physics-informed aggregator
- **Next.js Dashboard**: Real-time 3D visualization and training monitoring

**Privacy-First Design:**
- Raw data never leaves local nodes
- Only learned features are shared with central server
- Kubernetes namespace isolation

---

## 📂 Data Preparation

### Required Datasets

Place your data files in the following structure:

```
H:/Akash/DigitalTwin/data/
├── imaging/
│   ├── patient_001.nii
│   ├── patient_002.nii
│   └── ...
├── clinical/
│   └── records.csv          # Columns: patient_id, age, bmi, symptoms, etc.
├── pathology/
│   └── lab_reports.csv      # Columns: patient_id, marker1, marker2, etc.
└── labels/
    └── annotations.csv      # Columns: patient_id, has_endometriosis (0/1)
```

### 3D Uterus Model (Optional)

If you have a custom 3D mesh, place it here:
```
H:/Akash/DigitalTwin/assets/models/uterus.glb
```

Otherwise, the system will generate one from your MRI scans.

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** with Kubernetes enabled OR **Minikube**
- **Python 3.9+**
- **Node.js 18+**

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./setup_infrastructure.sh
```

This will:
1. Start/verify Kubernetes cluster
2. Build all Docker images
3. Deploy services to Kubernetes
4. Set up port forwarding

### Option 2: Manual Setup

**1. Build Docker Images**
```bash
cd backend
docker build -f Dockerfile.client -t imaging-node:latest .
docker build -f Dockerfile.client -t clinical-node:latest .
docker build -f Dockerfile.client -t pathology-node:latest .
docker build -f Dockerfile.pinn -t pinn-server:latest .
```

**2. Deploy to Kubernetes**
```bash
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/imaging-node/
kubectl apply -f k8s/clinical-node/
kubectl apply -f k8s/pathology-node/
kubectl apply -f k8s/pinn-server/
```

**3. Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 Accessing Services

**Frontend Dashboard:**
```
http://localhost:3000
```

**API Endpoints:**
- Imaging Node: `http://localhost:8001`
- Clinical Node: `http://localhost:8002`
- Pathology Node: `http://localhost:8003`
- PINN Server: `http://localhost:8004`

**Kubernetes Port Forwarding:**
```bash
kubectl port-forward -n node-imaging svc/imaging-service 8001:8000
kubectl port-forward -n node-clinical svc/clinical-service 8002:8000
kubectl port-forward -n node-pathology svc/pathology-service 8003:8000
kubectl port-forward -n central-pinn svc/pinn-service 8004:8000
```

---

## 📊 Using the System

### 1. Training Federated Nodes

**Via Dashboard:**
- Navigate to Dashboard → Click "Start Training"

**Via API:**
```bash
# Train all nodes
curl -X POST http://localhost:8001/train
curl -X POST http://localhost:8002/train
curl -X POST http://localhost:8003/train
```

### 2. Making Predictions

```bash
curl -X POST http://localhost:8004/predict \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "001"
  }'
```

**Response:**
```json
{
  "prediction": 0.73,
  "stiffness": 6.2,
  "confidence": 0.89,
  "risk_level": "high"
}
```

### 3. Viewing 3D Digital Twin

- Navigate to `Simulation` page
- Click "Load Patient"
- Click "Simulate"
- 3D uterus model will color-code based on stiffness prediction:
  - **Red**: High stiffness (>5 kPa) - Endometriosis risk
  - **Pink**: Moderate (2-5 kPa)
  - **White**: Healthy (<2 kPa)

---

## 🏗️ Architecture Details

### Federated Learning Flow

```
User Dashboard
     ↓
   Trigger Training
     ↓
┌────────────────────────────────┐
│  Imaging Node (namespace)      │ → Extracts 128-dim features
│  Clinical Node (namespace)     │ → Extracts 64-dim features  
│  Pathology Node (namespace)    │ → Extracts 64-dim features
└────────────────────────────────┘
     ↓ (Only Features Shared)
┌────────────────────────────────┐
│  Central PINN Server           │
│  - Aggregates vectors          │
│  - Applies Physics Loss        │
│  - Generates Predictions       │
└────────────────────────────────┘
     ↓
   Frontend 3D Viewer
```

### Physics-Informed Loss

```python
Total Loss = MSE_Loss + 0.1 × Physics_Constraint

Physics Constraint:
- If prediction = "Endometriosis" → stiffness must be > 5 kPa
- If prediction = "Healthy" → stiffness must be < 2 kPa
```

This ensures medically plausible predictions based on tissue mechanics.

---

## 🛠️ Development

### Project Structure

```
DigitalTwin/
├── k8s/                    # Kubernetes manifests
├── backend/                # Python microservices
│   ├── clients/           # Federated nodes
│   ├── pinn_server/       # Central aggregator
│   └── utils/             # Shared utilities
├── frontend/              # Next.js dashboard
└── data/                  # Your datasets (not in git)
```

### Tech Stack

- **Infrastructure**: Kubernetes, Docker
- **Backend**: Python 3.9, FastAPI, PyTorch
- **Frontend**: Next.js 14, TypeScript, Shadcn UI, React Three Fiber
- **Database**: SQLite (MVP), PostgreSQL (Production)

---

## 📈 Monitoring

**Check Pod Status:**
```bash
kubectl get pods --all-namespaces
```

**View Logs:**
```bash
kubectl logs -n node-imaging <pod-name>
```

**Check Services:**
```bash
kubectl get services --all-namespaces
```

---

## 🔐 Security & Compliance

- **Data Isolation**: Each node runs in isolated Kubernetes namespace
- **No Raw Data Sharing**: Only aggregated features leave federated nodes
- **Audit Logs**: All predictions logged with timestamps
- **Encryption**: TLS for all inter-service communication (production)

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

This is a research project. For questions or collaboration:
- Open an issue
- Submit a pull request
- Contact: [Your Email]

---

## 🎓 References

- Physics-Informed Neural Networks (PINNs)
- Federated Learning for Healthcare
- Tissue Elasticity Imaging
