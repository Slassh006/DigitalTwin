#!/bin/bash
# =============================================================
#  EndoTwin AI - Full EC2 Cross-Check & Validation Script
#
#  Run this ON your EC2 instance to verify that:
#    1. All pods are Running
#    2. All service endpoints are reachable
#    3. Federated nodes (Imaging / Clinical / Pathology) are healthy
#    4. PINN server is healthy and the model is loaded
#    5. Prediction endpoint returns a valid response
#    6. Training can be triggered and completes
#    7. Training history is stored
#    8. Analytics/metrics endpoint works
#    9. Logs endpoint works
#   10. Frontend is serving HTTP
#
#  Usage (on EC2 Ubuntu):
#    chmod +x scripts/cross_check_ec2.sh
#    ./scripts/cross_check_ec2.sh
#
#  Optional: pass your public EC2 IP as arg 1 and port base as arg 2
#    ./scripts/cross_check_ec2.sh 3.91.200.5
# =============================================================

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────
EC2_IP="${1:-localhost}"          # Pass EC2 public IP as first arg, else use localhost
IMAGING_URL="http://${EC2_IP}:8001"
CLINICAL_URL="http://${EC2_IP}:8002"
PATHOLOGY_URL="http://${EC2_IP}:8003"
PINN_URL="http://${EC2_IP}:8004"
FRONTEND_URL="http://${EC2_IP}:3000"

PASS=0
FAIL=0
WARN=0

# ─── Colors ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

# ─── Helpers ─────────────────────────────────────────────────────────────────────
pass()  { echo -e "${GREEN}  ✅  PASS${NC}  $1"; ((PASS++)); }
fail()  { echo -e "${RED}  ❌  FAIL${NC}  $1"; ((FAIL++)); }
warn()  { echo -e "${YELLOW}  ⚠️   WARN${NC}  $1"; ((WARN++)); }
info()  { echo -e "${CYAN}  ℹ️   INFO${NC}  $1"; }
header(){ echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $1${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}"; }

# HTTP GET with timeout, returns body or empty on failure
get() { curl -s --max-time 8 "$1" 2>/dev/null; }
# HTTP POST JSON, returns body or empty on failure
post_json() { curl -s --max-time 60 -X POST -H "Content-Type: application/json" -d "$2" "$1" 2>/dev/null; }

check_http_200() {
    local url="$1" label="$2"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        pass "$label → HTTP 200"
    else
        fail "$label → HTTP $code (expected 200)"
    fi
}

json_field() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2','MISSING'))" 2>/dev/null; }

# ─── PHASE 0: Kubernetes Pod Status ─────────────────────────────────────────────
header "PHASE 0 · Kubernetes Pod Status"

if command -v microk8s &>/dev/null; then
    info "Using: sudo microk8s kubectl"
    KUBECTL="sudo microk8s kubectl"
elif command -v kubectl &>/dev/null; then
    info "Using: kubectl"
    KUBECTL="kubectl"
else
    warn "kubectl / microk8s not found on this machine. Skipping K8s checks."
    KUBECTL=""
fi

if [ -n "$KUBECTL" ]; then
    echo ""
    info "All pods across namespaces:"
    $KUBECTL get pods -A --no-headers 2>/dev/null | while IFS= read -r line; do
        if echo "$line" | grep -qE "(Running|Completed)"; then
            echo -e "  ${GREEN}▶${NC}  $line"
        else
            echo -e "  ${RED}▶${NC}  $line"
        fi
    done || warn "Could not list pods."

    echo ""
    info "Checking pod readiness per namespace..."
    for ns in node-imaging node-clinical node-pathology central-pinn frontend; do
        TOTAL=$($KUBECTL get pods -n "$ns" --no-headers 2>/dev/null | wc -l || echo 0)
        READY=$($KUBECTL get pods -n "$ns" --no-headers 2>/dev/null | grep -c "Running" || echo 0)
        if [ "$TOTAL" -eq 0 ]; then
            warn "Namespace $ns: no pods found"
        elif [ "$READY" -eq "$TOTAL" ]; then
            pass "Namespace $ns: $READY/$TOTAL pods Running"
        else
            fail "Namespace $ns: $READY/$TOTAL pods Running — some pods not ready"
        fi
    done
fi

# ─── PHASE 1: Federated Node Health ─────────────────────────────────────────────
header "PHASE 1 · Federated Node Health Checks"

for node_info in "Imaging|${IMAGING_URL}" "Clinical|${CLINICAL_URL}" "Pathology|${PATHOLOGY_URL}"; do
    NAME="${node_info%%|*}"
    URL="${node_info##*|}"
    BODY=$(get "${URL}/health")
    if [ -z "$BODY" ]; then
        fail "$NAME Node ${URL}/health → unreachable"
    else
        STATUS=$(json_field "$BODY" "status")
        if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "ok" ]; then
            pass "$NAME Node /health → $STATUS"
        else
            warn "$NAME Node /health → status='$STATUS' (body: $BODY)"
        fi
    fi
done

# ─── PHASE 2: Federated Node Feature Endpoints ──────────────────────────────────
header "PHASE 2 · Federated Node Feature Endpoints"

for node_info in "Imaging|${IMAGING_URL}" "Clinical|${CLINICAL_URL}" "Pathology|${PATHOLOGY_URL}"; do
    NAME="${node_info%%|*}"
    URL="${node_info##*|}"
    BODY=$(get "${URL}/features")
    if [ -z "$BODY" ]; then
        warn "$NAME Node /features → empty response (node might need training first)"
    else
        # Check if it has a 'features' key
        HAS_FEATURES=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'features' in d or isinstance(d,list) else 'no')" 2>/dev/null || echo "unknown")
        if [ "$HAS_FEATURES" = "yes" ]; then
            FEAT_LEN=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); f=d.get('features',d); print(len(f) if isinstance(f,list) else 'N/A')" 2>/dev/null || echo "?")
            pass "$NAME Node /features → ${FEAT_LEN} features returned"
        else
            warn "$NAME Node /features → unexpected response: $BODY"
        fi
    fi
done

# ─── PHASE 3: PINN Server Health ────────────────────────────────────────────────
header "PHASE 3 · PINN Server Health & Readiness"

PINN_HEALTH=$(get "${PINN_URL}/health")
if [ -z "$PINN_HEALTH" ]; then
    fail "PINN Server /health → unreachable at ${PINN_URL}"
else
    STATUS=$(json_field "$PINN_HEALTH" "status")
    MODEL_LOADED=$(json_field "$PINN_HEALTH" "model_loaded")
    DEVICE=$(json_field "$PINN_HEALTH" "device")
    pass "PINN Server /health → status=$STATUS, model_loaded=$MODEL_LOADED, device=$DEVICE"

    # Check each federated node status reported by PINN
    IMAGING_N=$(echo "$PINN_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('federated_nodes',{}).get('imaging','?'))" 2>/dev/null)
    CLINICAL_N=$(echo "$PINN_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('federated_nodes',{}).get('clinical','?'))" 2>/dev/null)
    PATHOLOGY_N=$(echo "$PINN_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('federated_nodes',{}).get('pathology','?'))" 2>/dev/null)

    for n_info in "Imaging|$IMAGING_N" "Clinical|$CLINICAL_N" "Pathology|$PATHOLOGY_N"; do
        N="${n_info%%|*}"; V="${n_info##*|}"
        if [ "$V" = "healthy" ]; then
            pass "  PINN sees $N node → healthy"
        else
            warn "  PINN sees $N node → $V"
        fi
    done
fi

# Readiness check
READY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "${PINN_URL}/ready" 2>/dev/null || echo "000")
if [ "$READY_CODE" = "200" ]; then
    pass "PINN Server /ready → HTTP 200 (model loaded & not training)"
else
    warn "PINN Server /ready → HTTP $READY_CODE (model not ready or currently training)"
fi

# ─── PHASE 4: Statistics Endpoint ───────────────────────────────────────────────
header "PHASE 4 · Dashboard Statistics (/stats)"

STATS=$(get "${PINN_URL}/stats")
if [ -z "$STATS" ]; then
    fail "PINN /stats → unreachable"
else
    ACTIVE_NODES=$(json_field "$STATS" "active_nodes")
    PREDICTIONS=$(json_field "$STATS" "predictions_made")
    EPOCHS=$(json_field "$STATS" "total_epochs_trained")
    IS_TRAINING=$(json_field "$STATS" "is_training")
    pass "PINN /stats → active_nodes=$ACTIVE_NODES, predictions_made=$PREDICTIONS, total_epochs=$EPOCHS, is_training=$IS_TRAINING"
fi

# ─── PHASE 5: Prediction Endpoint ───────────────────────────────────────────────
header "PHASE 5 · Prediction Endpoint (/predict)"

info "Sending prediction request with mock features (all 0.5 values)..."
IMAGING_FEAT=$(python3 -c "import json; print(json.dumps([0.5]*128))")
CLINICAL_FEAT=$(python3 -c "import json; print(json.dumps([0.5]*64))")
PATHOLOGY_FEAT=$(python3 -c "import json; print(json.dumps([0.5]*64))")

PREDICT_PAYLOAD=$(python3 -c "
import json
body = {
    'imaging_features': [0.5]*128,
    'clinical_features': [0.5]*64,
    'pathology_features': [0.5]*64
}
print(json.dumps(body))
")

PRED_RESULT=$(post_json "${PINN_URL}/predict" "$PREDICT_PAYLOAD")

if [ -z "$PRED_RESULT" ]; then
    fail "PINN /predict → empty response"
else
    PRED_VAL=$(json_field "$PRED_RESULT" "prediction")
    STIFF_VAL=$(json_field "$PRED_RESULT" "stiffness")
    CONF_VAL=$(json_field "$PRED_RESULT" "confidence")
    RISK_VAL=$(json_field "$PRED_RESULT" "risk_level")

    if [ "$PRED_VAL" = "MISSING" ]; then
        fail "PINN /predict → unexpected response: $PRED_RESULT"
    else
        pass "PINN /predict → prediction=$PRED_VAL, stiffness=$STIFF_VAL kPa, confidence=$CONF_VAL, risk=$RISK_VAL"

        # Sanity: check no NaN in response
        NAN_CHECK=$(echo "$PRED_RESULT" | python3 -c "
import sys,json,math
d=json.load(sys.stdin)
bad=[(k,v) for k,v in d.items() if isinstance(v,float) and (math.isnan(v) or math.isinf(v))]
print('NaN/Inf:'+str(bad) if bad else 'clean')
" 2>/dev/null || echo "unknown")
        if [ "$NAN_CHECK" = "clean" ]; then
            pass "PINN /predict → no NaN/Inf values in response"
        else
            fail "PINN /predict → NaN/Inf detected: $NAN_CHECK"
        fi

        # Sanity: values in range
        python3 -c "
import json,sys
d=json.load(sys.stdin)
ok=True
if not (0<=d.get('prediction',99)<=1): print('prediction out of range'); ok=False
if not (0<=d.get('stiffness',99)<=15): print('stiffness out of range'); ok=False
if not (0<=d.get('confidence',99)<=1): print('confidence out of range'); ok=False
if ok: print('all_ok')
" <<< "$PRED_RESULT" | while read -r line; do
            if [ "$line" = "all_ok" ]; then
                pass "PINN /predict → all values within valid physiological ranges"
            else
                warn "PINN /predict → value issue: $line"
            fi
        done
    fi
fi

# ─── PHASE 6: Federated Training ────────────────────────────────────────────────
header "PHASE 6 · Federated Training (/train)"

info "Triggering a short training run (3 epochs)..."
TRAIN_PAYLOAD='{"epochs": 3, "learning_rate": 0.001, "batch_size": 4}'
TRAIN_RESULT=$(post_json "${PINN_URL}/train" "$TRAIN_PAYLOAD")

if [ -z "$TRAIN_RESULT" ]; then
    fail "PINN /train → empty response (training may have crashed)"
else
    TRAIN_STATUS=$(json_field "$TRAIN_RESULT" "status")
    EPOCHS_DONE=$(json_field "$TRAIN_RESULT" "epochs_completed")
    FINAL_LOSS=$(json_field "$TRAIN_RESULT" "final_loss")

    if [ "$TRAIN_STATUS" = "success" ]; then
        pass "PINN /train → completed successfully: epochs=$EPOCHS_DONE, final_loss=$FINAL_LOSS"
    elif echo "$TRAIN_RESULT" | grep -qi "already in progress"; then
        warn "PINN /train → training already in progress (409 conflict - this is not an error)"
    elif echo "$TRAIN_RESULT" | grep -qi "No module\|ModuleNotFoundError"; then
        fail "PINN /train → Python module import error: $TRAIN_RESULT"
    elif echo "$TRAIN_RESULT" | grep -qi "error\|exception\|traceback"; then
        fail "PINN /train → error: $TRAIN_RESULT"
    else
        warn "PINN /train → unexpected response: $TRAIN_RESULT"
    fi
fi

# ─── PHASE 7: Training History ──────────────────────────────────────────────────
header "PHASE 7 · Training History (/training/history)"

HISTORY=$(get "${PINN_URL}/training/history")
if [ -z "$HISTORY" ]; then
    fail "PINN /training/history → unreachable"
else
    COUNT=$(echo "$HISTORY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', len(d.get('training_runs',[]))))" 2>/dev/null || echo "?")
    if [ "$COUNT" = "0" ] || [ "$COUNT" = "?" ]; then
        warn "PINN /training/history → no training runs recorded yet (train first)"
    else
        pass "PINN /training/history → $COUNT training run(s) recorded"
    fi
fi

# ─── PHASE 8: Analytics Metrics ─────────────────────────────────────────────────
header "PHASE 8 · Analytics Metrics (/analytics/metrics)"

ANALYTICS=$(get "${PINN_URL}/analytics/metrics")
if [ -z "$ANALYTICS" ]; then
    fail "PINN /analytics/metrics → unreachable"
else
    ACCURACY=$(echo "$ANALYTICS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('model_metrics',{}).get('accuracy','null'))" 2>/dev/null || echo "?")
    TOTAL_PREDS=$(json_field "$ANALYTICS" "total_predictions")
    pass "PINN /analytics/metrics → accuracy=$ACCURACY, total_predictions=$TOTAL_PREDS"
fi

# ─── PHASE 9: Logs Endpoint ─────────────────────────────────────────────────────
header "PHASE 9 · Log Streaming (/logs)"

LOGS=$(get "${PINN_URL}/logs?limit=5")
if [ -z "$LOGS" ]; then
    fail "PINN /logs → unreachable"
else
    LOG_COUNT=$(echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null || echo "?")
    pass "PINN /logs → $LOG_COUNT log entries in ring buffer"

    info "Last 3 log messages:"
    echo "$LOGS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for e in d.get('logs',[])[-3:]:
    print(f\"    [{e.get('timestamp','')} {e.get('type','')}] {e.get('message','')}\")
" 2>/dev/null || true
fi

# ─── PHASE 10: Node Status (from PINN) ──────────────────────────────────────────
header "PHASE 10 · Node Status via PINN (/status/nodes)"

NODE_STATUS=$(get "${PINN_URL}/status/nodes")
if [ -z "$NODE_STATUS" ]; then
    fail "PINN /status/nodes → unreachable"
else
    echo "$NODE_STATUS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for n in d.get('nodes',[]):
    sym = '✅' if n.get('status')=='healthy' else '❌'
    tr  = ' [TRAINING]' if n.get('is_training') else ''
    print(f\"    {sym}  {n.get('name','?')}: {n.get('status','?')}{tr}  ({n.get('url','?')})\")
" 2>/dev/null || echo "$NODE_STATUS"
    pass "PINN /status/nodes → response received"
fi

# ─── PHASE 11: 3D Mesh Generation ───────────────────────────────────────────────
header "PHASE 11 · 3D Mesh Generation (/mesh/5.0)"

MESH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${PINN_URL}/mesh/5.0" 2>/dev/null || echo "000")
if [ "$MESH_CODE" = "200" ]; then
    pass "PINN /mesh/5.0 → HTTP 200 (GLB mesh generated successfully)"
else
    fail "PINN /mesh/5.0 → HTTP $MESH_CODE (mesh generation failed)"
fi

# ─── PHASE 12: Patient & Config CRUD ────────────────────────────────────────────
header "PHASE 12 · Patient & Config API"

# Config
CONFIG=$(get "${PINN_URL}/config")
if [ -z "$CONFIG" ]; then
    fail "PINN /config → unreachable"
else
    pass "PINN /config → settings retrieved"
fi

# Create a test patient
TEST_PATIENT_PAYLOAD='{"name":"Test Patient","age":32,"diagnosis_stage":"Stage 2"}'
PATIENT_CREATE=$(post_json "${PINN_URL}/patients" "$TEST_PATIENT_PAYLOAD")
if [ -z "$PATIENT_CREATE" ]; then
    warn "PINN /patients POST → empty response"
else
    PATIENT_ID=$(json_field "$PATIENT_CREATE" "id")
    if [ "$PATIENT_ID" = "MISSING" ] || [ -z "$PATIENT_ID" ]; then
        warn "PINN /patients POST → patient created but ID not returned: $PATIENT_CREATE"
    else
        pass "PINN /patients POST → patient created, id=$PATIENT_ID"
        # Clean up
        DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 -X DELETE "${PINN_URL}/patients/${PATIENT_ID}" 2>/dev/null || echo "000")
        if [ "$DEL_CODE" = "200" ]; then
            pass "PINN /patients DELETE → test patient cleaned up"
        else
            warn "PINN /patients DELETE → HTTP $DEL_CODE"
        fi
    fi
fi

# ─── PHASE 13: Frontend ─────────────────────────────────────────────────────────
header "PHASE 13 · Frontend Availability"

FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${FRONTEND_URL}" 2>/dev/null || echo "000")
if [ "$FRONTEND_CODE" = "200" ]; then
    pass "Frontend ${FRONTEND_URL} → HTTP 200"
elif [ "$FRONTEND_CODE" = "308" ] || [ "$FRONTEND_CODE" = "301" ] || [ "$FRONTEND_CODE" = "302" ]; then
    pass "Frontend ${FRONTEND_URL} → HTTP $FRONTEND_CODE (redirect — likely working)"
else
    fail "Frontend ${FRONTEND_URL} → HTTP $FRONTEND_CODE (expected 200)"
fi

# ─── PHASE 14: Pod Logs Spot-Check ──────────────────────────────────────────────
header "PHASE 14 · Pod Logs Spot-Check"

if [ -n "$KUBECTL" ]; then
    for ns_app in "central-pinn|pinn-server" "node-imaging|imaging-node" "node-clinical|clinical-node" "node-pathology|pathology-node"; do
        NS="${ns_app%%|*}"
        APP="${ns_app##*|}"
        LOG_OUTPUT=$($KUBECTL logs -n "$NS" -l "app=$APP" --tail=5 2>/dev/null || echo "")
        if [ -z "$LOG_OUTPUT" ]; then
            warn "No logs from $NS/$APP (pod might be starting up)"
        elif echo "$LOG_OUTPUT" | grep -qi "error\|traceback\|exception"; then
            warn "$NS/$APP logs contain ERROR/EXCEPTION — check with: $KUBECTL logs -n $NS -l app=$APP --tail=50"
            echo "       Last line: $(echo "$LOG_OUTPUT" | tail -1)"
        else
            pass "$NS/$APP → logs clean (no errors in last 5 lines)"
        fi
    done
fi

# ─── SUMMARY ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  CROSS-CHECK SUMMARY${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  PASSED : $PASS${NC}"
echo -e "${YELLOW}  ⚠️   WARNED : $WARN${NC}"
echo -e "${RED}  ❌  FAILED : $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$WARN" -le 2 ]; then
    echo -e "${GREEN}${BOLD}  🎉 ALL SYSTEMS OPERATIONAL — EndoTwin AI is fully functional!${NC}"
elif [ "$FAIL" -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}  ⚠️  RUNNING WITH WARNINGS — Review warnings above.${NC}"
else
    echo -e "${RED}${BOLD}  ❌  ISSUES DETECTED — Fix FAILED items before training.${NC}"
    echo ""
    echo -e "${YELLOW}  Quick debug commands:${NC}"
    echo "    sudo microk8s kubectl get pods -A"
    echo "    sudo microk8s kubectl logs -n central-pinn -l app=pinn-server --tail=50"
    echo "    sudo microk8s kubectl logs -n node-imaging  -l app=imaging-node --tail=30"
    echo "    sudo microk8s kubectl describe pod -n central-pinn <pod-name>"
fi

echo ""
echo -e "${CYAN}  Service URLs:${NC}"
echo "    Frontend   : ${FRONTEND_URL}"
echo "    PINN Server: ${PINN_URL}"
echo "    Imaging    : ${IMAGING_URL}"
echo "    Clinical   : ${CLINICAL_URL}"
echo "    Pathology  : ${PATHOLOGY_URL}"
echo ""
echo -e "${CYAN}  Useful follow-up commands:${NC}"
echo "    # Stream PINN server logs live:"
echo "    sudo microk8s kubectl logs -f -n central-pinn -l app=pinn-server"
echo ""
echo "    # Re-run a longer training (20 epochs) directly:"
echo "    curl -s -X POST ${PINN_URL}/train -H 'Content-Type: application/json' \\"
echo "         -d '{\"epochs\":20,\"learning_rate\":0.001,\"batch_size\":4}' | python3 -m json.tool"
echo ""
echo "    # Check training history after training:"
echo "    curl -s ${PINN_URL}/training/history | python3 -m json.tool"
echo ""
echo "    # Stream logs from the /logs API (incremental):"
echo "    curl -s '${PINN_URL}/logs?limit=50' | python3 -m json.tool"
