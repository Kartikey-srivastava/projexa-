import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.main import (
    get_system_status,
    get_all_zones,
    get_current_sensors,
    predict_crop_yield,
    simulate_what_if_scenario,
    chat_with_farm_ai,
    trigger_sensor_action,
    get_historical_analytics,
)
from app.models.schemas import (
    YieldPredictionRequest,
    WhatIfSimulationRequest,
    AssistantChatRequest,
    SensorActionRequest,
)

def run_tests():
    print("Testing backend endpoints directly...")

    # 1. Status
    res = get_system_status()
    assert res["status"] == "healthy"
    print("[PASS] GET /api/status:", res["stream_mode"])

    # 2. Zones
    zones = get_all_zones()
    assert len(zones) >= 4
    print(f"[PASS] GET /api/zones: {len(zones)} zones retrieved")

    # 3. Current Sensors
    sensor_sum = get_current_sensors("zone-a")
    assert sensor_sum.latest_reading is not None
    print("[PASS] GET /api/sensors/current: Moisture:", sensor_sum.latest_reading.soil_moisture)

    # 4. Predict Yield
    req = YieldPredictionRequest(zone_id="zone-a", crop_type="Wheat")
    pred = predict_crop_yield(req)
    assert pred.predicted_yield_t_ha > 0
    print(f"[PASS] POST /api/predictions/yield: Predicted: {pred.predicted_yield_t_ha} t/ha, SHAP count: {len(pred.shap_contributions)}")

    # 5. What-If Simulator
    w_req = WhatIfSimulationRequest(
        zone_id="zone-a",
        crop_type="Wheat",
        soil_moisture=25.0,
        nitrogen=120.0,
        phosphorus=40.0,
        potassium=130.0,
        soil_ph=6.5,
        temperature=32.0,
        rainfall=20.0,
    )
    sim = simulate_what_if_scenario(w_req)
    assert sim.simulated_yield_t_ha > 0
    print(f"[PASS] POST /api/simulator/what-if: Baseline: {sim.baseline_yield_t_ha}, Sim: {sim.simulated_yield_t_ha} ({sim.delta_pct}%), Risk: {sim.risk_level}")

    # 6. AI Assistant Chat
    c_req = AssistantChatRequest(
        zone_id="zone-a",
        message="Why did my predicted yield drop in Wheat?",
    )
    chat_res = chat_with_farm_ai(c_req)
    assert len(chat_res.answer) > 0
    print("[PASS] POST /api/assistant/chat: Answer verified")

    # 7. Action trigger
    a_req = SensorActionRequest(zone_id="zone-a", action="irrigate")
    action_res = trigger_sensor_action(a_req)
    assert action_res["success"] is True
    print("[PASS] POST /api/sensors/action:", action_res["message"])

    # 8. Historical Analytics
    hist = get_historical_analytics()
    assert len(hist["seasonal_data"]) > 0
    print("[PASS] GET /api/analytics/historical: Seasons count:", len(hist["seasonal_data"]))

    print("\nALL BACKEND AGRI-TECH SERVICES VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
