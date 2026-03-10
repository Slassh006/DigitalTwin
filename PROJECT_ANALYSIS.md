# EndoTwin / DigitalTwin — Full Project Analysis

## 1. Overview

| Aspect | Description |
|--------|-------------|
| **Name** | EndoTwin (Endometriosis Digital Twin Platform) |
| **Purpose** | Research prototype for endometriosis prediction using **Federated Learning** and **Physics-Informed Neural Networks (PINNs)**. Provides a 3D digital twin of the uterus with stiffness heatmaps, lesion markers, and clinical analytics. |
| **Scope** | Full-stack: Next.js frontend, Python FastAPI backend, federated node microservices, 3D visualization (WebGL), Kubernetes/GKE and Docker deployment. |
| **Medical context** | For research use only; not for clinical diagnosis. Patient data is encoded into feature vectors; PINN predicts tissue stiffness and lesion locations; results are visualized on a 3D uterus model. |

---

## 2. High-Level Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    NGINX (80/443)                        │
                    │         / → frontend    /api → pinn-server               │
                    │         /ws/stream → WebSocket    /nodes → proxy         │
                    └─────────────────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
┌─────────────────┐                 ┌─────────────────┐                 ┌─────────────────┐
│   Next.js       │                 │  PINN Server     │                 │  Federated       │
│   Frontend      │ ◄──HTTP/WS────► │  (FastAPI)      │ ◄──HTTP────────►│  Nodes          │
│   (Port 3000)   │   /api, /ws     │  (Port 8004)    │   /nodes/*      │  Imaging 8001   │
│                 │                 │                 │                 │  Clinical 8002  │
└─────────────────┘                 │  - EndoPINN     │                 │  Pathology 8003 │
                                    │  - FedAvg       │                 └─────────────────┘
                                    │  - Mesh/GLB     │
                                    │  - Training     │
                                    └─────────────────┘
```

- **Frontend**: Single Next.js app; talks to backend via `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8004` or `/api` when behind nginx).
- **PINN server**: Central FastAPI service — inference, federated aggregation, mesh generation, training, WebSocket logs.
- **Federated nodes**: Three separate services (Imaging, Clinical, Pathology) simulating distributed data sources; PINN server aggregates their contributions (FedAvg).
- **Nginx**: Reverse proxy in front of frontend and PINN; routes `/api` and `/ws/stream` to backend.

---

## 3. Tech Stack (Actual)

| Layer | Technology | Notes |
|-------|------------|--------|
| **Frontend** | Next.js 14, React 18, TypeScript | App Router, server components where used |
| **Styling** | Tailwind CSS, Framer Motion, shadcn/ui (Radix) | Dark theme, sci‑fi console aesthetic |
| **3D** | Three.js, @react-three/fiber, @react-three/drei, postprocessing | GLB uterus mesh, custom hologram shaders, bloom |
| **3D / Medical** | @kitware/vtk.js | Volumetric / stiffness views (vtk-volume-viewer) |
| **Charts** | Recharts | Training curves, analytics, population benchmarking |
| **Backend** | Python 3.x, FastAPI | Async API, CORS, WebSocket |
| **ML** | PyTorch | EndoPINN model, physics loss, FedAvg aggregator |
| **Mesh / export** | trimesh, skimage (marching_cubes) | Uterus mesh generation, stiffness colormap, GLB export |
| **Containers** | Docker, Docker Compose | 5 services: imaging, clinical, pathology, pinn-server, frontend |
| **Proxy** | Nginx | Reverse proxy, WebSocket upgrade, timeouts |
| **Orchestration** | Kubernetes (GKE) | k8s/ manifests for frontend, pinn-server, 3 node types |
| **Scripts** | Bash (GKE, AWS, EC2), Python (data/organize) | Setup, deploy, data upload |

---

## 4. Directory Structure (Summary)

```
DigitalTwin/
├── frontend/                    # Next.js 14 app
│   ├── app/                     # App Router
│   │   ├── layout.tsx           # Root layout, theme, toasts
│   │   ├── page.tsx             # Home: 3D viewer + federated panels + training metrics
│   │   ├── simulation/page.tsx  # Simulate prediction, 3D + results panel
│   │   ├── training/page.tsx    # Training evolution, PINN viz, federated weights, logs
│   │   ├── analytics/page.tsx   # Longitudinal, AI insights, biomarker, population, physics error
│   │   └── settings/page.tsx   # General + model config (learning rate, batch, epochs, etc.)
│   ├── components/
│   │   ├── three/               # 3D uterus (R3F)
│   │   │   ├── digital-twin-viewer.tsx  # Canvas, BackendMesh, lesions, bloom, toggles
│   │   │   ├── backend-mesh.tsx         # GLB + hologram ShaderMaterial (vertex/frag GLSL)
│   │   │   ├── lesion-marker.tsx        # Spheres + callout panels + connector lines
│   │   │   ├── holographic-effects.tsx  # Particles, grid
│   │   │   └── shaders/                 # hologram.vert.glsl, hologram.frag.glsl
│   │   ├── visualization/      # Data panels, stiffness bars, VTK/GLB viewers
│   │   ├── training/            # Evolution panel, PINN viz, weights, hyperparams, console logs
│   │   ├── analytics/           # Longitudinal, AI insights, biomarker, population, physics error
│   │   ├── dashboard/           # (removed duplicates; training-metrics-dashboard used)
│   │   ├── ui/                  # Button, Card, Slider, Select, Switch, Toast, etc.
│   │   ├── header-new.tsx
│   │   ├── federated-nodes-panel.tsx
│   │   ├── prediction-engine-panel.tsx
│   │   └── training-metrics-dashboard.tsx
│   ├── lib/                     # api.ts, utils, patient-encoder, simulation-engine, animations
│   ├── types/                   # prediction.ts, patient.ts, settings.ts
│   ├── public/                  # uterus3DModal.glb, grid-pattern, etc.
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/
│   ├── pinn_server/             # Central API & ML
│   │   ├── server.py            # FastAPI app, /predict, /train, /stats, /mesh, /logs, WebSocket
│   │   ├── model.py             # EndoPINN (imaging+clinical+pathology fusion, stiffness, displacement)
│   │   └── aggregator.py        # FedAvgAggregator
│   ├── clients/                 # Federated node apps
│   │   ├── client_imaging.py
│   │   ├── client_clinical.py
│   │   └── client_pathology.py
│   ├── utils/
│   │   ├── physics_loss.py      # Navier-Cauchy residual, PINNLoss
│   │   ├── mesh_generator.py    # Simplified uterus mesh, stiffness colormap, GLB export
│   │   ├── patient_manager.py
│   │   ├── settings_manager.py
│   │   ├── training_history_manager.py
│   │   ├── document_parser.py, multiformat_loader.py, data_loaders.py, etc.
│   │   └── ...
│   ├── data/                    # models, meshes, training_history.json, settings.json
│   ├── Dockerfile.pinn
│   ├── Dockerfile.client
│   └── requirements-pinn.txt, requirements-client.txt
│
├── k8s/                         # GKE manifests
│   ├── frontend/, pinn-server/, imaging-node/, clinical-node/, pathology-node/
│   └── namespaces.yaml
│
├── scripts/                     # setup_gke.sh, deploy.sh, deploy_aws.sh, ec2_full_setup.sh, etc.
├── docker-compose.yml           # 5 services + nginx
├── nginx.conf
├── README.md
├── APPLICATION_REVIEW.md
├── ENDOTWIN_ARCHITECTURE_FLOW.txt
├── GETTING_STARTED.md
├── WINDOWS_DEPLOYMENT.md
└── PROJECT_ANALYSIS.md          # This file
```

---

## 5. Data Flow (End-to-End)

### 5.1 Prediction flow

1. **User** (Simulation page): Clicks “Simulate” (optionally with a patient context).
2. **Frontend** (`lib/api.ts`): `POST /predict` with JSON body (e.g. `{ patient_id }`).
3. **PINN server** (`pinn_server/server.py`): Loads or builds patient feature vectors (imaging 128d, clinical 64d, pathology 64d), runs `EndoPINN` forward pass.
4. **Model** (`model.py`): Fuses modalities, outputs prediction probability, stiffness (kPa), and 3D displacement for physics loss.
5. **Server**: Optionally generates mesh with stiffness colormap (`mesh_generator`), returns JSON: `prediction`, `stiffness`, `confidence`, `risk_level`, `lesions`, etc.
6. **Frontend**: Updates `DigitalTwinViewer` (stiffness → heatmap, lesion markers) and results panel.

### 5.2 Training flow

1. **User** (Home or Training): Triggers training (e.g. “Train” or similar).
2. **Frontend**: `POST /train` with `{ epochs }`.
3. **PINN server**: Runs federated rounds: pull weights from imaging/clinical/pathology nodes, run local training with physics loss, aggregate via `FedAvgAggregator`, push global model back.
4. **Logs**: Server pushes log lines to in-memory buffer; frontend polls `/logs` or uses WebSocket `/ws/stream` for “Quantum Console” and training metrics.
5. **Frontend**: Training evolution panel and metrics dashboard show MSE/physics loss and node contributions.

### 5.3 Patient data input

- **Structured input**: `patient-input-form.tsx` + `lib/patient-encoder.ts` encode Imaging / Clinical / Pathology inputs into 128d + 64d + 64d vectors.
- **Submission**: Encoded vectors (or references) are sent to `POST /predict`.
- **Unstructured**: Backend `utils` (e.g. document_parser, multiformat_loader) support PDF/OCR and other formats for extracting biomarkers used in the pipeline.

---

## 6. Backend Deep Dive

### 6.1 PINN server (`pinn_server/server.py`)

- **Endpoints (summary)**:
  - `GET /health` — Liveness.
  - `POST /predict` — Main prediction; returns stiffness, confidence, risk_level, lesions, etc.
  - `POST /train` — Federated training with configurable epochs.
  - `GET /stats` — Model accuracy, node counts, predictions count, training status.
  - `GET /status/nodes` — Status of imaging/clinical/pathology nodes.
  - `GET /mesh/<stiffness>` — Returns GLB bytes for uterus mesh with stiffness-based coloring.
  - `GET /logs` — Recent in-memory log buffer (e.g. for Quantum Console).
  - `WebSocket /ws/stream` — Real-time log stream.
  - Patient CRUD, config, training history endpoints as implemented.
- **Model**: `EndoPINN` in `model.py` — multi-modal fusion, prediction head, stiffness head, displacement head (for Navier-Cauchy physics loss).
- **Physics**: `utils/physics_loss.py` — Navier-Cauchy residual (Lamé, strain, Laplacian), combined into `PINNLoss`.
- **Mesh**: `utils/mesh_generator.py` — simplified uterus mesh, stiffness colormap, export to GLB; used for `/mesh/<stiffness>` and any server-side mesh prep.

### 6.2 Federated clients

- **Imaging** (8001), **Clinical** (8002), **Pathology** (8003): Each runs a FastAPI app (`clients/client_*.py`) with local data mounted; PINN server calls them for federated rounds (weights / gradients), not raw data.
- **Docker Compose**: Each node has its own container and volume (e.g. `./data/imaging`, `./data/clinical`, `./data/pathology`).

### 6.3 Key backend utils

- **patient_manager**: In-memory or persistent patient store used by `/predict` and patient APIs.
- **settings_manager**: Learning rate, batch size, epochs, etc.; used by training and possibly config API.
- **training_history_manager**: Persists training history (e.g. `data/training_history.json`) for charts and dashboard.

---

## 7. Frontend Deep Dive

### 7.1 Pages (App Router)

| Route | Role |
|-------|------|
| `/` | Home dashboard: header, federated nodes panel, 3D digital twin viewer, prediction engine panel, training metrics dashboard. |
| `/simulation` | Dedicated “Simulate” flow: 3D viewer + results panel (probability, stiffness, confidence, risk) + stiffness legend. |
| `/training` | Training evolution graph, PINN architecture viz, federated weights panel, hyperparameters panel, Quantum Console logs. |
| `/analytics` | Longitudinal trend, AI insights, biomarker sensitivity, population benchmarking, physics error distribution. |
| `/settings` | General (e.g. notifications) and model config (learning rate, batch size, physics loss weight, epochs); loads/saves via API. |

All main pages use `Header` (header-new.tsx) and share the same dark, “console” style layout.

### 7.2 3D visualization (Three.js)

- **digital-twin-viewer.tsx**:
  - R3F Canvas, OrbitControls, Bloom (postprocessing).
  - `BackendMesh`: loads `/models/uterus.glb` (or fallback geometry), applies custom hologram shader.
  - **Shader**: Vertex — glitch displacement, stiffness-reactive motion; Fragment — Fresnel glow, cyan/magenta scan lines, heatmap overlay (green &lt;2 kPa, yellow 2–5, red &gt;5).
  - Toggles: Heatmap on/off, Callouts on/off.
  - Stiffness legend and optional hover tooltips.
  - Lesion markers (spheres + Html callouts + dashed connector lines) from `predictionData.lesions` or defaults.
- **backend-mesh.tsx**: Uses `ShaderMaterial` with `hologram.vert.glsl` and `hologram.frag.glsl`; uniforms for time, stiffness, heatmap enable, colors, opacity.
- **lesion-marker.tsx**: R3F group with sphere(s), optional ring, `Html` callout panel (stiffness, confidence, risk score, severity), and animated line to callout.

### 7.3 Other key components

- **federated-nodes-panel**: Polls `/status/nodes`, shows Imaging/Clinical/Pathology status (e.g. unreachable/healthy).
- **prediction-engine-panel**: Shows model accuracy, total epochs, physics loss, node contribution bars; data from `/stats` and analytics APIs.
- **training-metrics-dashboard**: Training loss curves (e.g. MSE, physics); data from training history API.
- **DataPanel / StiffnessBar**: Used in viewer and analytics for structured metrics and regional stiffness.

### 7.4 API client (`lib/api.ts`)

- Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8004`).
- Exposes: `predict`, `trainFederatedNodes`, `getNodeStatus`, `getMeshUrl`, `getStats`, patient CRUD, settings, training history, analytics.
- Typed with interfaces (`PredictionResponse`, `LesionData`, `NodeStatus`, etc.); no retries or timeouts documented in current snippet.

---

## 8. Deployment

### 8.1 Docker Compose (local / single-host)

- **Services**: imaging-node (8001), clinical-node (8002), pathology-node (8003), pinn-server (8004), frontend (Next.js), nginx (80/443).
- **Volumes**: Per-node data dirs, backend `data/models` and `data/meshes`.
- **Nginx**: Proxies `/` to frontend, `/api/` to pinn-server, `/ws/stream` to backend WebSocket, `/nodes/` to backend.

### 8.2 Kubernetes (GKE)

- **Manifests** under `k8s/`: namespaces, frontend (deployment + service), pinn-server (deployment + service + PVC), imaging/clinical/pathology nodes (deployment + service + PVC each).
- **Scripts**: `scripts/setup_gke.sh` (cluster/APIs), `scripts/deploy.sh` (build + apply).

### 8.3 AWS / EC2

- Scripts: `setup_aws.sh`, `deploy_aws.sh`, `ec2_full_setup.sh`, `cross_check_ec2.sh` for EC2-based setup and checks.

---

## 9. Strengths

- **Clear separation**: Frontend (Next.js), central PINN API, federated nodes, mesh generation, physics loss.
- **Rich 3D UX**: Custom hologram shader, heatmap by stiffness, lesion callouts, toggles, and consistent dark theme.
- **Physics-informed design**: Navier-Cauchy residual and Lamé parameters in the loss; stiffness and displacement heads in the model.
- **Federated simulation**: Three nodes + FedAvg aggregator and training flow implemented.
- **Multiple deployment paths**: Docker Compose, GKE, and EC2-oriented scripts.
- **TypeScript and typed API**: Shared types for prediction, patient, settings.
- **Documentation**: README, APPLICATION_REVIEW, ENDOTWIN_ARCHITECTURE_FLOW, GETTING_STARTED, WINDOWS_DEPLOYMENT.

---

## 10. Gaps & Recommendations

| Area | Observation | Suggestion |
|------|-------------|------------|
| **API resilience** | No timeouts or retries in `api.ts`. | Add request timeout (e.g. 30s) and limited retries for `/predict` and `/train`. |
| **Error UX** | Generic “Failed to fetch” / “Prediction failed”. | Map status codes and body to user-facing messages (e.g. “Backend offline”, “Invalid patient”). |
| **Settings API** | Frontend calls config API; when backend is down, settings page used to go blank. | Already improved with default values and “Backend unreachable” banner; ensure all config reads handle 5xx. |
| **Vertex-level heatmap** | Heatmap is currently driven by global stiffness and shader logic (spatial variation in fragment). | If backend ever provides per-vertex stiffness, add a `BufferAttribute` and pass it into the shader for a true vertex-accurate heatmap. |
| **Medical disclaimer** | README and flow docs mention research-only. | Confirm a visible disclaimer on every UI screen (e.g. in layout or header) and in API responses. |
| **Tests** | Only `backend/tests/test_physics_loss.py` seen. | Add API tests (e.g. `/health`, `/predict` with mock data), and optional frontend smoke tests. |
| **Dataset and training** | No explicit “10 datasets” layout or FedPINN training script in the same form as the “master prompt” spec. | If aligning with that spec, add the requested dataset folders and training pipeline (data loaders, FedPINN, export ONNX) under a dedicated structure. |
| **K8s and Compose** | Nginx and Compose reference `pinn-server:8000`; frontend expects API at `/api` or `NEXT_PUBLIC_API_URL`. | Ensure env in Compose/K8s sets `NEXT_PUBLIC_API_URL` correctly for browser (e.g. `/api` when same host). |

---

## 11. File Count (Approximate)

- **Frontend**: ~50+ TS/TSX/CSS/config files (app, components, lib, types, ui, three, analytics, training, visualization).
- **Backend**: ~25+ Python files (pinn_server, clients, utils).
- **K8s**: 16 YAML files.
- **Scripts**: 9+ shell/Python.
- **Docs/config**: README, APPLICATION_REVIEW, ENDOTWIN_ARCHITECTURE_FLOW, GETTING_STARTED, WINDOWS_DEPLOYMENT, nginx, docker-compose, Dockerfiles, .gitignore, etc.

Overall the codebase is a **production-style research prototype**: full prediction and training flows, federated simulation, 3D hologram uterus with stiffness heatmap and lesion callouts, and multiple deployment options, with room to harden API usage, errors, and optional vertex-level heatmap and dataset/training alignment.
