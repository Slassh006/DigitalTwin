# Endotwin: Endometriosis Digital Twin Platform 🏥

A next-generation **Digital Twin** platform for endometriosis prediction, utilizing **Federated Learning** and **Physics-Informed Neural Networks (PINNs)**. This system integrates real-time node contributions, longitudinal analytics, and high-fidelity 3D visualization to provide personalized patient insights while preserving data privacy.

---

## 🌟 Key Features

### 1. 🌐 Federated Learning Ecosystem
*   **Privacy-First:** Trains on distributed data nodes (Imaging, Clinical, Pathology) without raw data ever leaving the source.
*   **Real-Time Contributions:** Visualizes live weight updates and contribution percentages from each federated node.
*   **Secure Aggregation:** Central PINN server aggregates learned patterns to update the global model.

### 2. 🧠 Physics-Informed AI (PINN)
*   **Medical Accuracy:** Incorporates tissue elasticity physics (Lamé parameters) into the loss function.
*   **Constraint Enforcement:** Ensures predictions obey biological laws (e.g., stiff tissue corresponds to lesions).
*   **Dynamic Hyperparameters:** Real-time tuning of learning rates, batch sizes, and physics weights via the Training Dashboard.

### 3. 🖥️ Endotwin Console (Frontend)
*   **Real-Time 3D Visualization:** Interactive **Digital Twin** of the uterus (`uterus.glb`) rendered with `Three.js`.
    *   **Stiffness Mapping:** Dynamic color-coding (Green=Healthy, Red=Lesion) based on AI predictions.
    *   **Lesion Markers:** 3D spatial markers identifying potential endometriosis sites.
*   **Live Training Metrics:**
    *   **Quantum Console Logs:** Streaming logs of training epochs and system events.
    *   **Evolution Graph:** Real-time MSE and Physics Loss tracking.
*   **Analytics Hub:**
    *   **Longitudinal Trends:** Patient history tracking over time.
    *   **Population Benchmarking:** Compare patient metrics against global cohorts.
    *   **Physics Error Distribution:** Analysis of model adherence to physical constraints.

---

## 🚀 Quick Start

### Prerequisites
*   **Node.js 18+**
*   **Python 3.9+**
*   **Docker Desktop**
*   **Google Cloud SDK** (for GKE deployment)

### 1. Local Development

**Frontend (Console):**
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3000
```

**Backend (Simulation):**
To run the full backend locally using Docker Compose:
```bash
docker-compose up --build
```

### 2. Cloud Deployment (GKE) ☁️

This project is optimized for deployment on **Google Kubernetes Engine (GKE)**.

#### **Step 1: Setup Infrastructure**
Run the setup script to enable APIs, create the Artifact Registry, and provision the GKE cluster:
```bash
chmod +x scripts/setup_gke.sh
./scripts/setup_gke.sh
```

#### **Step 2: Deploy Application**
Run the deploy script to build images, push them to GCR, and apply Kubernetes manifests:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### **Step 3: Access Application**
Get the external IP address of the frontend service:
```bash
kubectl get services -n frontend
```

---

## 📂 Project Structure

```
H:/Akash/DigitalTwin/
├── frontend/               # Next.js 14 Application
│   ├── app/                # App Router (Pages)
│   ├── components/         # React Components
│   │   ├── three/          # 3D Visualization (DigitalTwinViewer)
│   │   ├── training/       # Training Dashboard Panels
│   │   └── analytics/      # Analytics Charts
│   ├── lib/                # Utilities & API Clients
│   ├── Dockerfile          # Frontend Container Config
│   └── public/
│       └── models/         # 3D Assets (uterus.glb)
├── backend/                # Python Microservices
│   ├── pinn_server/        # Central Aggregator (FastAPI)
│   └── clients/            # Federated Nodes (Imaging, Clinical, Pathology)
├── k8s/                    # Kubernetes Manifests
│   ├── frontend/           # Frontend Deployment & Service
│   ├── pinn-server/        # Central Server Deployment
│   └── [node]-node/        # Federated Nodes Deployments
└── scripts/                # Automation Scripts
    ├── setup_gke.sh        # Infrastructure Setup
    └── deploy.sh           # Build & Deploy
```

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
*   **Visualization:** React Three Fiber, Drei, Recharts
*   **Backend:** Python, FastAPI, PyTorch (PINN)
*   **Infrastructure:** Docker, Google Kubernetes Engine (GKE), Artifact Registry
