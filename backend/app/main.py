import asyncio
import io
import csv
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    ZoneInfo,
    SensorReading,
    ZoneTelemetrySummary,
    YieldPredictionRequest,
    YieldPredictionResponse,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
    AlertItem,
    ZoneThresholds,
    AssistantChatRequest,
    AssistantChatResponse,
    SensorActionRequest,
    SeasonalComparisonPoint,
)
from app.services.sensor_simulator import iot_simulator, ZONE_DEFINITIONS
from app.services.ml_engine import ml_engine, CROP_BENCHMARKS
from app.services.alert_service import alert_service
from app.services.ai_assistant import farm_assistant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agri-backend")

# Connection manager for active WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_json(self, data: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            if dc in self.active_connections:
                self.active_connections.remove(dc)


ws_manager = ConnectionManager()

# Background simulator loop
simulator_running = True


async def simulation_background_worker():
    while simulator_running:
        try:
            fresh_readings = iot_simulator.tick()
            # Feed readings to alert anomaly detection
            for zone_id, reading in fresh_readings.items():
                alert_service.check_reading(reading)

            # Broadcast to WebSockets
            if ws_manager.active_connections:
                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "readings": {
                        zid: reading.model_dump(mode="json")
                        for zid, reading in fresh_readings.items()
                    },
                }
                await ws_manager.broadcast_json(payload)
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}", exc_info=True)

        await asyncio.sleep(3.0)


# Historical multi-season mock data
SEASONAL_HISTORY: List[SeasonalComparisonPoint] = [
    SeasonalComparisonPoint(
        season="2024 Kharif / Summer",
        crop="Rice",
        predicted_yield_t_ha=6.2,
        actual_yield_t_ha=6.05,
        avg_rainfall_mm=195.0,
        avg_moisture_pct=72.0,
        efficiency_pct=94.5,
    ),
    SeasonalComparisonPoint(
        season="2024 Rabi / Winter",
        crop="Wheat",
        predicted_yield_t_ha=5.1,
        actual_yield_t_ha=5.25,
        avg_rainfall_mm=65.0,
        avg_moisture_pct=56.0,
        efficiency_pct=96.2,
    ),
    SeasonalComparisonPoint(
        season="2025 Kharif / Summer",
        crop="Rice",
        predicted_yield_t_ha=6.4,
        actual_yield_t_ha=6.30,
        avg_rainfall_mm=180.0,
        avg_moisture_pct=70.0,
        efficiency_pct=95.0,
    ),
    SeasonalComparisonPoint(
        season="2025 Rabi / Winter",
        crop="Wheat",
        predicted_yield_t_ha=5.3,
        actual_yield_t_ha=5.42,
        avg_rainfall_mm=72.0,
        avg_moisture_pct=58.0,
        efficiency_pct=97.1,
    ),
    SeasonalComparisonPoint(
        season="2026 Spring Current",
        crop="Maize",
        predicted_yield_t_ha=8.4,
        actual_yield_t_ha=8.20,
        avg_rainfall_mm=95.0,
        avg_moisture_pct=61.0,
        efficiency_pct=93.8,
    ),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background simulation worker
    task = asyncio.create_task(simulation_background_worker())
    logger.info("Background IoT simulator started.")
    yield
    # Shutdown
    global simulator_running
    simulator_running = False
    task.cancel()
    logger.info("Background IoT simulator terminated.")


app = FastAPI(
    title="AI-Powered Real-Time Crop Yield Prediction and Smart Farm Monitoring",
    description="Full-stack enterprise farm intelligence system with Scikit-Learn/XAI SHAP, resilient IoT simulation, and live WebSockets.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/status")
def get_system_status():
    return {
        "status": "healthy",
        "stream_mode": "Simulated Stream (Active)",
        "storage_mode": "Resilient In-Memory Fallback",
        "mongo_available": False,  # Seamless fallback
        "active_zones": len(ZONE_DEFINITIONS),
        "connected_ws_clients": len(ws_manager.active_connections),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }


@app.get("/api/zones", response_model=List[ZoneInfo])
def get_all_zones():
    return ZONE_DEFINITIONS


@app.get("/api/zones/{zone_id}", response_model=ZoneTelemetrySummary)
def get_zone_details(zone_id: str):
    summary = iot_simulator.get_summary(zone_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Zone not found")
    return summary


@app.get("/api/sensors/current")
def get_current_sensors(zone_id: Optional[str] = None):
    if zone_id:
        summary = iot_simulator.get_summary(zone_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Zone not found")
        return summary
    else:
        return {
            z.id: iot_simulator.get_summary(z.id)
            for z in ZONE_DEFINITIONS
        }


@app.get("/api/sensors/history")
def get_sensor_history(
    zone_id: str = Query("zone-a"),
    limit: int = Query(35, ge=5, le=100),
):
    history = iot_simulator.get_history(zone_id, limit=limit)
    return [h.model_dump(mode="json") for h in history]


@app.post("/api/sensors/action")
def trigger_sensor_action(req: SensorActionRequest):
    message = iot_simulator.apply_action(req)
    # Check bounds immediately
    summary = iot_simulator.get_summary(req.zone_id)
    if summary:
        alert_service.check_reading(summary.latest_reading)
    return {
        "success": True,
        "action": req.action,
        "zone_id": req.zone_id,
        "message": message,
        "updated_state": iot_simulator.current_state.get(req.zone_id),
    }


@app.post("/api/predictions/yield", response_model=YieldPredictionResponse)
def predict_crop_yield(req: YieldPredictionRequest):
    zone = next((z for z in ZONE_DEFINITIONS if z.id == req.zone_id), ZONE_DEFINITIONS[0])
    crop = req.crop_type or zone.crop

    # Retrieve current live telemetry as base features
    summary = iot_simulator.get_summary(req.zone_id)
    reading = summary.latest_reading if summary else None

    feature_dict = {
        "soil_moisture": req.soil_moisture if req.soil_moisture is not None else (reading.soil_moisture if reading else 50.0),
        "soil_temperature": (reading.soil_temperature if reading else 21.0),
        "air_temperature": req.temperature if req.temperature is not None else (reading.air_temperature if reading else 24.0),
        "relative_humidity": (reading.relative_humidity if reading else 60.0),
        "soil_ph": req.soil_ph if req.soil_ph is not None else (reading.soil_ph if reading else 6.5),
        "nitrogen": req.nitrogen if req.nitrogen is not None else (reading.nitrogen if reading else 130.0),
        "phosphorus": req.phosphorus if req.phosphorus is not None else (reading.phosphorus if reading else 45.0),
        "potassium": req.potassium if req.potassium is not None else (reading.potassium if reading else 140.0),
        "rainfall": req.rainfall if req.rainfall is not None else (reading.rainfall if reading else 15.0),
        "solar_radiation": req.solar_radiation if req.solar_radiation is not None else (reading.solar_radiation if reading else 19.0),
    }

    pred_yield, confidence, shap_contribs, summary_text, key_rec = ml_engine.predict(crop, feature_dict)
    bench = CROP_BENCHMARKS.get(crop, CROP_BENCHMARKS["Wheat"])
    delta_vs_hist = ((pred_yield - bench["base"]) / bench["base"]) * 100.0

    if delta_vs_hist >= 5.0:
        tier = "Above Average"
    elif delta_vs_hist >= -5.0:
        tier = "Average"
    elif delta_vs_hist >= -15.0:
        tier = "Below Average"
    else:
        tier = "Severely Depressed"

    return YieldPredictionResponse(
        zone_id=req.zone_id,
        zone_name=zone.name,
        crop_type=crop,
        growth_stage=req.growth_stage or "Flowering",
        predicted_yield_t_ha=round(pred_yield, 2),
        confidence_score=confidence,
        historical_avg_yield_t_ha=round(bench["base"], 2),
        delta_vs_historical_pct=round(delta_vs_hist, 1),
        performance_tier=tier,
        shap_contributions=shap_contribs,
        plain_english_summary=summary_text,
        key_recommendation=key_rec,
        generated_at=datetime.now(timezone.utc),
    )


@app.post("/api/simulator/what-if", response_model=WhatIfSimulationResponse)
def simulate_what_if_scenario(req: WhatIfSimulationRequest):
    return ml_engine.simulate_what_if(req)


@app.get("/api/alerts", response_model=List[AlertItem])
def get_alerts(
    zone_id: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
):
    return alert_service.get_alerts(zone_id=zone_id, severity=severity, resolved=resolved)


@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert_by_id(alert_id: str):
    alert = alert_service.resolve_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True, "alert": alert}


@app.get("/api/alerts/thresholds")
def get_thresholds(zone_id: str = Query("zone-a")):
    t = alert_service.get_thresholds(zone_id)
    if not t:
        raise HTTPException(status_code=404, detail="Zone thresholds not found")
    return t


@app.put("/api/alerts/thresholds")
def update_thresholds(req: ZoneThresholds):
    updated = alert_service.update_thresholds(req)
    return {"success": True, "thresholds": updated}


@app.get("/api/analytics/historical")
def get_historical_analytics():
    return {
        "seasonal_data": SEASONAL_HISTORY,
        "annual_trend": [
            {"year": "2021", "actual": 4.9, "predicted": 4.85, "variance_pct": -1.0},
            {"year": "2022", "actual": 5.1, "predicted": 5.15, "variance_pct": +0.9},
            {"year": "2023", "actual": 4.7, "predicted": 4.80, "variance_pct": +2.1},
            {"year": "2024", "actual": 5.4, "predicted": 5.35, "variance_pct": -0.9},
            {"year": "2025", "actual": 5.65, "predicted": 5.60, "variance_pct": -0.8},
        ],
    }


@app.get("/api/analytics/export-csv")
def export_csv_report(zone_id: str = Query("zone-a")):
    history = iot_simulator.get_history(zone_id, limit=60)
    zone = next((z for z in ZONE_DEFINITIONS if z.id == zone_id), ZONE_DEFINITIONS[0])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp (UTC)",
        "Zone ID",
        "Zone Name",
        "Crop",
        "Soil Moisture (%)",
        "Soil Temp (°C)",
        "Air Temp (°C)",
        "Relative Humidity (%)",
        "Soil pH",
        "Nitrogen (mg/kg)",
        "Phosphorus (mg/kg)",
        "Potassium (mg/kg)",
        "Light (Lux)",
        "Rainfall (mm)",
        "Solar Radiation (MJ/m2)",
        "Wind Speed (km/h)",
        "Health Status",
    ])

    for row in history:
        writer.writerow([
            row.timestamp.isoformat(),
            row.zone_id,
            row.zone_name,
            zone.crop,
            row.soil_moisture,
            row.soil_temperature,
            row.air_temperature,
            row.relative_humidity,
            row.soil_ph,
            row.nitrogen,
            row.phosphorus,
            row.potassium,
            row.light_intensity,
            row.rainfall,
            row.solar_radiation,
            row.wind_speed,
            row.status,
        ])

    output.seek(0)
    filename = f"farm_telemetry_{zone_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/api/assistant/chat", response_model=AssistantChatResponse)
def chat_with_farm_ai(req: AssistantChatRequest):
    return farm_assistant.answer_query(req)


@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial snapshot immediately upon connect
        initial_readings = {
            z.id: (iot_simulator.history_buffer[z.id][-1] if iot_simulator.history_buffer[z.id] else None)
            for z in ZONE_DEFINITIONS
        }
        await websocket.send_json({
            "type": "INITIAL_SNAPSHOT",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "readings": {
                k: v.model_dump(mode="json") if v else None
                for k, v in initial_readings.items()
            },
        })

        while True:
            # Keep socket alive and respond to client heartbeat/ping
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)
