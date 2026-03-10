# EndoTwin / DigitalTwin — Feature Plan & Analysis

This document lists **all current features** by area and provides a **planning matrix** (status, priority, gaps) for product and engineering.

---

## 1. Current Features (Inventory)

### 1.1 Frontend — Pages & Navigation

| Feature | Location | Description |
|--------|----------|-------------|
| **Dashboard (Home)** | `/` | 4-panel layout: Federated Nodes, 3D Digital Twin, Prediction Engine, Training Metrics. |
| **Simulation** | `/simulation` | Run prediction (Simulate button), 3D viewer with stiffness, results panel (probability, stiffness, confidence, risk), stiffness color legend. |
| **Training** | `/training` | Training evolution graph, PINN architecture viz, Federated Weights panel, Hyperparameters panel, Quantum Console logs. |
| **Analytics** | `/analytics` | Longitudinal trend, AI insights, Biomarker sensitivity, Population benchmarking, Physics error distribution. |
| **Settings** | `/settings` | General (notifications), Model config (learning rate, batch size, physics loss weight, epochs). Save/Retry when backend unreachable. |
| **Header navigation** | All pages | Tabs: Dashboard, Simulation, Training, Analytics, Settings. User label (e.g. Dr. A. Vance), TLS status, icons. |
| **Skip to content** | Layout | Accessibility link in root layout. |
| **Theme** | Layout | Dark default, theme provider (next-themes). |

---

### 1.2 Frontend — 3D Visualization

| Feature | Location | Description |
|--------|----------|-------------|
| **Uterus 3D viewer** | `digital-twin-viewer.tsx` | R3F Canvas, OrbitControls (drag, zoom, pan), auto-rotate. |
| **Hologram shader** | `backend-mesh.tsx` + GLSL | Vertex: glitch displacement, stiffness-reactive motion. Fragment: Fresnel glow, cyan/magenta scan lines, heatmap overlay (green &lt;2, yellow 2–5, red &gt;5 kPa). Opacity ~0.7. |
| **Heatmap toggle** | Viewer | HEATMAP on/off (stiffness coloring on mesh). |
| **Callouts toggle** | Viewer | CALLOUTS on/off (lesion panels + connector lines). |
| **Lesion markers** | `lesion-marker.tsx` | Glowing spheres at lesion positions; severity-based color; optional Html callout (stiffness, confidence, risk score, severity); animated dashed line to callout. |
| **Stiffness legend** | Viewer | &lt;2 kPa Healthy, 2–5 Moderate, &gt;5 Lesion (green/yellow/red). |
| **Hover tooltips** | Viewer | Stiffness value at pointer (simulated from position when backend not providing per-vertex data). |
| **Holographic effects** | `holographic-effects.tsx` | Particles, floor/back grid. |
| **Bloom** | postprocessing | Bloom pass (intensity, radius, threshold) for glow. |
| **Background** | Viewer | Dark navy (#0a0a1a). |
| **GLB mesh** | BackendMesh | Loads `/models/uterus.glb` or fallback capsule. |
| **VTK volume viewer** | `vtk-volume-viewer.tsx` | Optional volumetric stiffness view (component exists; usage depends on route). |
| **GLB viewer** | `glb-viewer.tsx` | Alternative GLB viewer with lesion/stiffness props. |

---

### 1.3 Frontend — Patient & Prediction Input

| Feature | Location | Description |
|--------|----------|-------------|
| **Patient input form** | `patient-input-form.tsx` | Tabs: Clinical, Imaging, Pathology. Sliders/inputs for age, BMI, pain VAS, dysmenorrhea, cycle length, depression/anxiety/stress, lesion count/size, endometrial thickness, rASRM, WBC, neutrophils, lymphocytes, CA-125/153/199, glucose. |
| **Patient encoder** | `lib/patient-encoder.ts` | Encodes form → Imaging 128d, Clinical 64d, Pathology 64d; builds JSON payload for `/api/predict`. |
| **Report uploader** | `report-uploader.tsx` | Drag-and-drop PDF (or image); calls backend; `onAnalysisComplete` callback. |
| **Simulate (simple)** | Simulation page | Single “Simulate” button; `POST /predict` with optional `patient_id`; no form on this page. |

---

### 1.4 Frontend — Federated Learning & Training UI

| Feature | Location | Description |
|--------|----------|-------------|
| **Federated nodes panel** | `federated-nodes-panel.tsx` | Lists Imaging, Clinical, Pathology; status (e.g. unreachable); “Initialize new node” (disabled when offline). Polls `/status/nodes`. |
| **Prediction engine panel** | `prediction-engine-panel.tsx` | Model accuracy, “Model ready”, total epochs, physics loss, node contribution bars. Data from `/stats` (and analytics). |
| **Training metrics dashboard** | `training-metrics-dashboard.tsx` | MSE loss & physics loss over time (from `/training/history`). |
| **Training evolution panel** | `training-evolution-panel.tsx` | Epoch range, status, loss curve (e.g. from `/training/history`). |
| **PINN architecture viz** | `pinn-architecture-viz.tsx` | Diagram: Input → Hidden → Output (u,v,p). |
| **Federated weights panel** | `federated-weights-panel.tsx` | Per-node contribution weights (from analytics/metrics). |
| **Hyperparameters panel** | `hyperparameters-panel.tsx` | Display/control of training hyperparameters. |
| **Quantum console logs** | `quantum-console-logs.tsx` | Polls `/logs`; shows timestamped log lines (INFO/WARN/ERROR/TRAIN). Command input (cosmetic or for future use). |

---

### 1.5 Frontend — Analytics

| Feature | Location | Description |
|--------|----------|-------------|
| **Longitudinal trend** | `longitudinal-trend-analysis.tsx` | Time-series chart (e.g. probability / tissue stiffness over months). |
| **AI insights panel** | `ai-insights-panel.tsx` | High-risk alerts, treatment efficacy, recommended actions, “Generating prognosis” steps. |
| **Biomarker sensitivity** | `biomarker-sensitivity.tsx` | CA-125, IL-6, TNF-α, VEGF-A with impact levels. |
| **Population benchmarking** | `population-benchmarking.tsx` | Scatter (e.g. age vs severity) with “You” vs cohort. |
| **Physics error dist** | `physics-error-dist.tsx` | Residual distribution chart. |

---

### 1.6 Frontend — Data Panels & Shared UI

| Feature | Location | Description |
|--------|----------|-------------|
| **Data panel** | `data-panel.tsx` | Styled panel with title and key-value data; position (top-left/right, bottom-left/right); accent color. |
| **Stiffness bar** | `data-panel.tsx` | Horizontal bar with label and value (e.g. regional stiffness). |
| **Regional stiffness** | Digital twin viewer | When `predictionData.regional_analysis` exists, shows regional stiffness bars. |
| **Node contributions** | Digital twin viewer | When `predictionData.node_contributions` exists, shows Imaging/Clinical/Pathology %. |
| **Toasts** | `use-toast.tsx` | Success/error toasts (e.g. prediction complete, settings saved, backend error). |
| **UI primitives** | `components/ui/` | Button, Card, Slider, Select, Switch, Tabs, Badge, Skeleton, Toast. |

---

### 1.7 Backend — PINN Server API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Liveness. |
| `/ready` | GET | Readiness. |
| `/predict` | POST | Main prediction (e.g. JSON body with patient_id or features). Returns stiffness, confidence, risk_level, lesions, etc. |
| `/api/predict/upload` | POST | Upload-based prediction (files). |
| `/train` | POST | Start federated training (e.g. `epochs`). |
| `/stats` | GET | Model accuracy, node counts, predictions count, training status. |
| `/status/nodes` | GET | Imaging/Clinical/Pathology node status. |
| `/mesh/{stiffness}` | GET | Returns GLB bytes for uterus mesh colored by stiffness. |
| `/training/history` | GET | Training runs and per-epoch loss. |
| `/logs` | GET | In-memory log buffer (for Quantum Console). |
| `/metrics` | GET | Prometheus-style or app metrics. |
| **Patients** | | |
| `/patients` | GET, POST | List, create. |
| `/patients/{id}` | GET, PUT, DELETE | Get, update, delete. |
| **Config** | | |
| `/config` | GET, PUT | Get/update settings (learning_rate, batch_size, physics_loss_weight, epochs, theme, notifications_enabled). |
| `/config/defaults` | GET | Default config. |
| **Analytics** | | |
| `/analytics/metrics` | GET | Model metrics, latest run, node performance, total predictions/epochs. |

---

### 1.8 Backend — Federated Nodes (per node)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Liveness. |
| `/ready` | GET | Readiness. |
| `/train` | POST | Local training. |
| `/features` | GET | Feature vector summary. |
| `/training/history` | GET | Local training history. |
| (Imaging) `/mesh`, `/patients` | GET | Imaging-specific. |

---

### 1.9 Backend — Core Logic

| Component | Description |
|-----------|-------------|
| **EndoPINN** | Multi-modal fusion (imaging 128d, clinical 64d, pathology 64d), prediction head, stiffness head, displacement head (for physics). |
| **FedAvgAggregator** | Aggregates client weights by sample count; distributes global model. |
| **Physics loss** | Navier-Cauchy residual (Lamé, strain, Laplacian); PINNLoss wrapper. |
| **Mesh generator** | Simplified uterus mesh, stiffness colormap, GLB export. |
| **Patient manager** | In-memory/persistent patient CRUD. |
| **Settings manager** | Load/save config (file or env). |
| **Training history manager** | Persist training runs (e.g. JSON). |
| **Document/parsing utils** | PDF/OCR and multiformat loaders for report ingestion. |

---

### 1.10 Deployment & DevOps

| Feature | Location | Description |
|--------|----------|-------------|
| **Docker Compose** | `docker-compose.yml` | imaging-node, clinical-node, pathology-node, pinn-server, frontend, nginx. |
| **Nginx** | `nginx.conf` | Reverse proxy: `/` → frontend, `/api/` → pinn-server, `/ws/stream` → backend, `/nodes/` → backend. |
| **GKE** | `k8s/` | Deployments/services/PVCs for frontend, pinn-server, 3 nodes. |
| **Scripts** | `scripts/` | setup_gke.sh, deploy.sh, deploy_aws.sh, ec2_full_setup.sh, check_status.sh, etc. |

---

## 2. Feature Planning Matrix

### 2.1 By status

| Status | Features |
|--------|----------|
| **Implemented & in use** | All 5 pages, 3D hologram + heatmap + callouts, federated panels, training UI, analytics panels, settings, patient form + encoder, report uploader, full PINN API and node APIs, Docker/K8s. |
| **Implemented, partial** | VTK volume viewer (component exists; not wired on main flows). WebSocket (`/ws/stream`) exists on backend; frontend does not use it for logs. Hover stiffness tooltip uses simulated value when no per-vertex data. |
| **Not implemented** | PDF report download, XAI “top factors” chart on a dedicated page, persistent auth, multi-tenancy, audit log UI, WebSocket log stream in UI. |

---

### 2.2 By priority (suggested)

| Priority | Area | Current state | Recommendation |
|----------|------|----------------|----------------|
| **P0 – Must have** | Prediction & 3D | Working end-to-end | Keep stable; add per-vertex stiffness when backend provides it. |
| **P0** | Settings & config | Working; fallback when backend down | Keep; ensure theme is applied from config. |
| **P0** | Medical disclaimer | In README/docs | Add visible disclaimer on every screen (layout/header). |
| **P1 – Should have** | API resilience | No timeouts/retries | Add timeout (e.g. 30s) and limited retries in `lib/api.ts`. |
| **P1** | Error UX | Generic “Failed to fetch” | Map status codes/body to user-facing messages. |
| **P1** | Training trigger | Backend has `/train` | Ensure one-click “Train” on Dashboard/Training page calls `/train` and updates panels. |
| **P2 – Nice to have** | WebSocket logs | Backend has `/ws/stream` | Option to stream logs in Quantum Console instead of polling. |
| **P2** | Export / report | Report upload exists | Add “Download report” (PDF or JSON) for current prediction. |
| **P2** | XAI panel | Backend can return factors | Dedicated XAI panel or section (e.g. top 10 factors bar chart). |
| **P2** | Vertex heatmap | Shader uses global stiffness + spatial variation | When backend has per-vertex stiffness, add BufferAttribute and use in shader. |

---

## 3. Feature Gaps & Dependencies

| Gap | Depends on | Notes |
|-----|------------|-------|
| **Per-vertex stiffness heatmap** | Backend (or mesh pipeline) providing stiffness per vertex | Enables precise heatmap from coordinates. |
| **Real-time log stream** | Frontend WebSocket client | Backend already exposes `/ws/stream`. |
| **PDF/clinical report download** | Backend endpoint (optional) or client-side PDF lib | Use existing prediction + metadata. |
| **Audit log UI** | Backend audit endpoint (if added) | Show recent predictions/errors. |
| **Theme from config** | Settings already have `theme` | Apply `theme` from `/config` to ThemeProvider. |

---

## 4. Suggested Roadmap (High Level)

1. **Stability & compliance**  
   - Add global medical disclaimer in layout/header.  
   - Add API timeouts and retries; improve error messages.

2. **Training & observability**  
   - Confirm “Train” button (or equivalent) triggers `/train` and refreshes training/analytics.  
   - Optional: WebSocket for live logs in Quantum Console.

3. **Export & explainability**  
   - “Download report” for current prediction (PDF or JSON).  
   - XAI section (e.g. top factors from prediction response).

4. **3D accuracy**  
   - When backend supports it: per-vertex stiffness attribute and shader update for heatmap.

5. **Settings**  
   - Apply `theme` from config; optionally surface more training/config knobs.

---

## 5. Quick Reference — Where Things Live

| I want to… | Look at |
|------------|---------|
| Change 3D hologram / heatmap | `frontend/components/three/backend-mesh.tsx`, `shaders/hologram.*.glsl`, `digital-twin-viewer.tsx` |
| Add a new page | `frontend/app/<name>/page.tsx`, add nav in `header-new.tsx` |
| Add prediction input fields | `patient-input-form.tsx`, `lib/patient-encoder.ts` |
| Change training UI | `training-evolution-panel`, `federated-weights-panel`, `hyperparameters-panel`, `quantum-console-logs` |
| Change analytics charts | `frontend/components/analytics/*.tsx` |
| Add/change API call | `frontend/lib/api.ts` |
| Add backend endpoint | `backend/pinn_server/server.py` |
| Change model or physics | `backend/pinn_server/model.py`, `backend/utils/physics_loss.py` |
| Change mesh generation | `backend/utils/mesh_generator.py` |

Use this document to plan sprints, prioritize bugs, and align new features with the existing inventory and dependencies.
