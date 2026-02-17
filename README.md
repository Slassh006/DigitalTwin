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
*   **Docker Desktop** (for full federated simulation)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Slassh006/DigitalTwin.git
cd DigitalTwin

# Frontend Setup
cd frontend
npm install
```

### 2. Running the Application

**Frontend (Console):**
```bash
cd frontend
npm run dev
# Access at http://localhost:3000
```

**Backend (Simulation):**
The frontend includes a **Simulation Engine** that generates realistic data if the backend is offline. To run the full backend:
```bash
./setup_infrastructure.sh
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
│   └── public/
│       └── models/         # 3D Assets (uterus.glb)
├── backend/                # Python Microservices
│   ├── pinn_server/        # Central Aggregator (FastAPI)
│   └── clients/            # Federated Nodes
└── k8s/                    # Kubernetes Deployment Manifests
```

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
*   **Visualization:** React Three Fiber, Drei, Recharts
*   **Backend:** Python, FastAPI, PyTorch
*   **Infrastructure:** Docker, Kubernetes

---

## 🧬 Scientific Context

The **Endotwin** platform addresses the critical need for non-invasive endometriosis diagnosis. By combining **Federated Learning** (to unlock siloed medical data) with **Physics-Informed Deep Learning** (to ensure reliability with limited data), we create a robust, privacy-preserving diagnostic tool. The **Digital Twin** visualization bridges the gap between AI output and clinical interpretation, allowing doctors to visualize tissue stiffness and potential lesions intuitively.
