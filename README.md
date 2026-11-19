# AI-Powered Real-Time Crop Yield Prediction and Smart Farm Monitoring System

An enterprise-grade, full-stack precision agriculture platform featuring real-time IoT sensor telemetry, Explainable AI (XAI) yield forecasting using Scikit-Learn Random Forest and SHAP-style attribution curves, an interactive "What-If" scenario simulator, and an edge anomaly watchdog with autonomous alerts.

---

## 🌟 Key Features

1. **Overview & Real-Time Farm Monitoring (Home Dashboard)**
   - Live telemetry KPI cards with trend indicators (`up`, `down`, `stable`) and target safe-range progress bars for Soil Moisture, Soil/Air Temperatures, Relative Humidity, Soil pH, NPK Macronutrients, and NASA POWER Solar/Weather factors.
   - Interactive Recharts time-series charts updating continuously via WebSocket (with seamless fallback polling).
   - Visual interactive Farm Zones Grid with live health statuses (`Optimal`, `Needs Attention`, `Anomaly Detected`).
   - One-click physical intervention testing: *Trigger Irrigation*, *Apply NPK Fertigation*, *Simulate Heatwave*, *Reset to Baseline*.

2. **Crop Yield Prediction & Explainable AI (XAI)**
   - Yield forecast card displaying predicted yield in **tons/hectare**, confidence scoring, and comparison against regional benchmarks.
   - **Horizontal Diverging SHAP Bar Chart**: Explains *why* the model made that prediction, displaying positive contributors in forest green and limiting stress factors in crimson red.
   - Plain-English AI Farm Advisory translating complex feature attributions into actionable 2-sentence agronomic advice.

3. **Interactive "What-If" Yield Simulator**
   - 7 responsive real-time sliders (Soil Moisture, Nitrogen, Phosphorus, Potassium, Soil pH, Temperature, Rainfall).
   - Instant debounced ML recalculation with side-by-side comparison bar chart (**Baseline Historical vs. Simulated Scenario**).
   - Resource efficiency score and preset scenario triggers: *Drought Stress Test*, *Optimal Fertilizer Boost*, *Heavy Monsoon*, *Sub-Zero Frost Snap*.

4. **Smart Alerts & Anomaly Detection Center**
   - Real-time filterable anomaly feed categorized by severity (`critical`, `warning`, `info`) and zone.
   - Actionable remediation advice for each anomaly and one-click "Mark Resolved" workflow.
   - Customizable safety thresholds per zone for autonomous edge alerting.

5. **Historical Analytics & Verification**
   - Multi-season comparison composed chart validating model forecasts against actual audited harvests.
   - One-click **Download CSV Report** endpoint generating complete time-series and diagnostic records.

6. **Floating AI Farm Assistant (Slide-Over Chat Drawer)**
   - Pre-loaded with live context from the active farm zone, real-time sensor streams, and SHAP vectors.
   - Instant quick-prompt chips: *"Why did my predicted yield drop?"*, *"How much should I irrigate Zone A today?"*, *"What fertilizer ratio does my soil need?"*.

7. **Resilient Fallback Mode (CRITICAL ZERO-BUG ARCHITECTURE)**
   - Connects to external MongoDB and MQTT brokers when available, OR **automatically falls back to an internal realistic Python IoT Sensor Simulator** if external services are offline.
   - Dual-mode streaming: Live WebSocket stream with automatic exponential reconnection and seamless fallback to REST polling.
   - React Error Boundaries and Skeleton Loaders wrap all visual components so malformed network data never causes blank screens.

---

## 🏗️ Architecture & Tech Stack

```
projexa/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app, WebSocket manager, endpoints, CORS
│   │   ├── models/schemas.py           # Pydantic v2 data models & validation
│   │   └── services/
│   │       ├── ml_engine.py            # Scikit-Learn Random Forest Regressor & SHAP attributions
│   │       ├── sensor_simulator.py     # Physics-based IoT diurnal sensor simulator
│   │       ├── alert_service.py        # Automated anomaly detection & threshold watcher
│   │       └── ai_assistant.py         # Contextual agronomic AI reasoning engine
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                 # Header, Sidebar, ErrorBoundary, SkeletonLoader, AgronomyTooltip, AIAssistantDrawer
│   │   │   └── views/                  # HomeDashboard, YieldPredictionView, WhatIfSimulatorView, AlertsCenterView, HistoricalAnalyticsView, FarmZonesView
│   │   ├── services/
│   │   │   ├── api.ts                  # Resilient API client with fallback defaults
│   │   │   └── websocket.ts            # Resilient WebSocket hook with auto-reconnect & polling fallback
│   │   ├── types/index.ts              # TypeScript interfaces
│   │   ├── App.tsx                     # Main layout & tab router
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend:** Python 3.11+, FastAPI, Pydantic, Scikit-learn, NumPy, Pandas, WebSockets, Uvicorn.

---

## 🚀 Quick Start (Local Development)

### 1. Start the FastAPI Backend
In a terminal, navigate to the project root and run:

```bash
# Windows / Linux / macOS
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend starts at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.*

### 2. Start the React Frontend
In a second terminal:

```bash
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🐳 Single-Command Docker Deployment

To launch the complete containerized stack (FastAPI Backend + React Nginx Frontend + MongoDB):

```bash
docker-compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API & Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/status`

---

## 📡 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | System health, stream mode, storage mode, and active zone count |
| `GET` | `/api/zones` | Metadata, crop, soil type, and health status for all 4 zones |
| `GET` | `/api/sensors/current` | Latest sensor readings and KPI status for zones |
| `GET` | `/api/sensors/history` | Rolling time-series data points for Recharts charts |
| `POST` | `/api/sensors/action` | Trigger physical intervention (`irrigate`, `fertilize_npk`, `heatwave`, etc.) |
| `POST` | `/api/predictions/yield` | Scikit-Learn crop yield prediction + SHAP feature attributions |
| `POST` | `/api/simulator/what-if` | Dynamic multi-variable what-if simulation with baseline comparison |
| `GET` | `/api/alerts` | Filterable list of real-time alerts & anomalies |
| `POST` | `/api/alerts/{id}/resolve` | Mark an alert resolved |
| `GET/PUT` | `/api/alerts/thresholds` | Retrieve or customize zone alert thresholds |
| `GET` | `/api/analytics/historical` | Multi-season verified harvest records and accuracy metrics |
| `GET` | `/api/analytics/export-csv` | Stream downloadable CSV report of sensor and harvest telemetry |
| `POST` | `/api/assistant/chat` | AI Farm Assistant contextual chat |
| `WS` | `/ws/live` | WebSocket real-time telemetry stream (broadcast every 3s) |
