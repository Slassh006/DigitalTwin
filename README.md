# Endotwin: Endometriosis Digital Twin Platform 🏥

A next-generation **Digital Twin** platform for endometriosis prediction, utilizing **Federated Learning** and **Physics-Informed Neural Networks (PINNs)**. This system integrates real-time node contributions, longitudinal analytics, and high-fidelity 2D clinical visualizations to provide personalized patient insights while preserving data privacy.

---

## 🌟 Key Features

### 1. 🌐 Federated Learning Ecosystem
*   **Privacy-First:** Trains on distributed data nodes (Imaging, Clinical, Pathology) without raw data ever leaving the source.
*   **Real-Time Contributions:** Visualizes live weight updates and contribution percentages from each federated node.
*   **Secure Aggregation:** Central PINN server aggregates learned patterns to update the global model.

### 2. 🧠 Physics-Informed AI (PINN)
*   **Medical Accuracy:** Incorporates tissue elasticity physics (Lamé parameters) into the loss function.
*   **Constraint Enforcement:** Ensures predictions obey biological laws (e.g., stiff tissue corresponds to lesions).
*   **Unstructured Data Pipeline:** Automatically extracts biological markers (CA-125, VAS pain score, lesion size) directly from patient PDFs and scanned images (using NLP and OCR). 

### 3. 🖥️ Endotwin Console (Frontend)
*   **3D Clinical Dashboard:**
    *   **Automated Report Ingestion:** Drag-and-drop interface for doctors to upload raw clinical reports.
    *   **Biomarker Radar Charts:** Compares extracted patient parameters against healthy baselines in real-time.
    *   **Dual 3D Anatomy Viewers:** High-fidelity interactive viewers combining surface anatomy and biomechanical tissue density heatmaps:
        *   **Surface Mesh Viewer (`@react-three/fiber`)**: Real-time rendering of a professional `.glb` anatomical model featuring dynamic physics-informed 3D lesion generation directly mapped to coordinate anchors based on PINN input.
        *   **Biomechanical Volume Map (`@kitware/vtk.js`)**: Synthetic physics rendering showing volumetric cross-sections of interior tissue stiffness probability maps.
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
*   **Tesseract OCR** (For image parsing)
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

**Backend (Simulation & PINN Server):**
Ensure you have the Python dependencies installed, including PyMuPDF and pytesseract for the document extraction pipeline.
```bash
cd backend
pip install -r requirements-pinn.txt
python -m uvicorn pinn_server.server:app --reload
# Access API at http://127.0.0.1:8000
```

### 2. Cloud Deployment (GKE) ☁️

This project uses **Google Cloud Build** to bypass local network restrictions and deploy reliably.

#### **Step 1: Setup Infrastructure**
Run the setup script to enable APIs (including Cloud Build) and create the GKE cluster:
```bash
chmod +x scripts/setup_gke.sh
./scripts/setup_gke.sh
```

#### **Step 2: Deploy Application**
Run the deploy script to submit builds to Cloud Build and apply Kubernetes manifests:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### **Step 3: Access Application**
Get the external IP address of the frontend service:
```bash
./scripts/check_status.sh
```

---

## 📂 Project Structure

```
H:/Akash/DigitalTwin/
├── frontend/               # Next.js 14 Application
│   ├── app/                # App Router (Pages)
│   ├── components/         # React Components
│   │   ├── visualization/  # 3D Clinical Dashboard (VTK.js & React Three Fiber)
│   │   ├── ui/             # Reusable UI (Tabs, Forms)
│   │   ├── training/       # Training Dashboard Panels
│   │   └── analytics/      # Analytics Charts
│   ├── public/             
│   │   └── uterus3DModal.glb # Static 3D mesh model asset
│   ├── lib/                # Utilities & API Clients
│   └── Dockerfile          # Frontend Container Config
├── backend/                # Python Microservices
│   ├── pinn_server/        # Central Aggregator & Inference API (FastAPI)
│   ├── utils/              # NLP & OCR Document Parsers
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

## 🛠️ Tech Stack & Architecture Decisions

### **Frontend**
*   **Framework:** Next.js 14, React, TypeScript
    *   *Why?* Next.js provides a robust foundation for building scalable SPAs with seamless routing and optimized performance. TypeScript ensures type safety across complex medical data structures.
*   **Styling:** Tailwind CSS, Framer Motion, shadcn/ui
    *   *Why?* Tailwind allows for rapid styling with a highly customizable design system. Framer Motion provides the fluid, modern animations that make the dashboard feel active and responsive.
*   **Visualization:** VTK.js, React Three Fiber, Recharts
    *   *Why?* For high-grade medical simulation, we need true 3D spatial anchoring. `VTK.js` provides volumetric heatmap layers (stiffness maps) common in DICOM viewers. `React Three Fiber` alongside `@react-three/drei` provides performant surface mesh rendering (parsing `.glb` anatomy models) to display dynamic anatomical changes (lesions) in a photorealistic context. Recharts powers our radar and bar charts for clinical comparison.
*   **Data Ingestion:** react-dropzone
    *   *Why?* Enables a seamless drag-and-drop interface for users to upload unstructured medical files (PDFs, images) directly into the simulation pipeline.

### **Backend**
*   **Core:** Python, FastAPI
    *   *Why?* FastAPI is highly performant and specifically built to handle the asynchronous API calls needed for federated learning nodes and AI inference endpoints.
*   **Machine Learning:** PyTorch (PINN)
    *   *Why?* PyTorch allows us to construct custom loss functions that encode physical laws (tissue elasticity) alongside traditional data-driven learning, rather than just relying on generic ML structures.
*   **Unstructured Data Pipeline (NLP/OCR):** 
    *   **PyMuPDF (`fitz`):** For fast, accurate text extraction from medical PDFs.
    *   **pytesseract / OpenCV:** For OCR extraction of scanned medical results or imaging reports.
    *   *Why?* Medical data exists in unstructured formats. These libraries enable the backend to automatically parse natural language (e.g., "CA-125 level is 18 U/mL") and reliably translate it into the scaled feature vectors our PINN requires.

### **Infrastructure**
*   **Containers & Orchestration:** Docker, Google Kubernetes Engine (GKE)
    *   *Why?* GKE orchestrates the federated learning deployment, allowing each node (Clinical, Pathology, Imaging) to run as isolated, secure microservices that simulate a realistic multi-hospital environment.
