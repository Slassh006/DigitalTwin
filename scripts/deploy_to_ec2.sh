#!/bin/bash
# =============================================================
#  EndoTwin - EC2 Remote Deployment Runner
#  This script runs ON THE EC2 INSTANCE to deploy all services.
# =============================================================
set -e

LOG="/tmp/endotwin_deploy.log"
log()     { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }
success() { echo "✅  $1" | tee -a "$LOG"; }
warn()    { echo "⚠️   $1" | tee -a "$LOG"; }
error()   { echo "❌  $1" | tee -a "$LOG"; exit 1; }

log "======================================================"
log "  EndoTwin — EC2 Docker Compose Deployment"
log "======================================================"

cd ~/DigitalTwin

# ── 1. Install Docker if needed ────────────────────────────
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    sudo usermod -aG docker "$USER"
    success "Docker installed."
else
    success "Docker already installed: $(docker --version)"
fi

# ── 2. Install Docker Compose plugin if needed ─────────────
if ! docker compose version &>/dev/null 2>&1; then
    log "Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
    success "Docker Compose plugin installed."
else
    success "Docker Compose: $(docker compose version)"
fi

# Ensure current user can run docker without sudo (newgrp workaround)
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

# ── 3. Create required data directories ───────────────────
log "Creating data directories..."
mkdir -p backend/data/models backend/data/meshes \
         data/imaging data/clinical data/pathology
success "Data directories ready."

# ── 4. Create .env for frontend ───────────────────────────
EC2_PUBLIC_IP=$(curl -s --max-time 5 \
    http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null \
    || curl -s --max-time 5 https://checkip.amazonaws.com 2>/dev/null \
    || echo "localhost")

log "Detected public IP: $EC2_PUBLIC_IP"

cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://${EC2_PUBLIC_IP}:8004
NEXT_PUBLIC_WS_URL=ws://${EC2_PUBLIC_IP}:8004/ws/stream
EOF
success "frontend/.env.local written with IP: $EC2_PUBLIC_IP"

# ── 5. Update backend CORS to allow EC2 IP ────────────────
# Patch server.py to also allow the EC2 public IP in CORS origins
SERVER_PY="backend/pinn_server/server.py"
if grep -q "allow_origins=\[" "$SERVER_PY"; then
    # Replace the allow_origins line to include a wildcard list
    sed -i "s|allow_origins=\[.*\]|allow_origins=[\"http://localhost:3000\", \"http://127.0.0.1:3000\", \"http://${EC2_PUBLIC_IP}\", \"http://${EC2_PUBLIC_IP}:3000\", \"http://${EC2_PUBLIC_IP}:8004\", \"*\"]|g" "$SERVER_PY"
    success "CORS origins updated in server.py"
fi

# ── 6. Build + Start All Services with Docker Compose ─────
log "Building Docker images (this may take 5-10 minutes)..."
docker compose build --no-cache 2>&1 | tail -20
success "All images built."

log "Starting all services..."
docker compose up -d
success "All services started."

# ── 7. Wait for services to be healthy ────────────────────
log "Waiting for services to be healthy (60s)..."
sleep 60

# ── 8. Status Summary ─────────────────────────────────────
log ""
log "======================================================"
log "      EndoTwin Deployment Complete!"
log "======================================================"
docker compose ps

log ""
log "  🌐 Frontend:   http://${EC2_PUBLIC_IP}:3000"
log "  🔬 PINN API:   http://${EC2_PUBLIC_IP}:8004"
log "  🩺 Health:     http://${EC2_PUBLIC_IP}:8004/health"
log "  📊 API Docs:   http://${EC2_PUBLIC_IP}:8004/docs"
log ""

# Quick health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 "http://localhost:8004/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    success "PINN Server health check PASSED (HTTP 200)"
else
    warn "PINN Server not yet responding (HTTP $HTTP_CODE) — may still be starting up."
    warn "Check logs: docker compose logs pinn-server"
fi

log ""
log "Useful commands:"
log "  docker compose logs -f pinn-server"
log "  docker compose logs -f frontend"
log "  docker compose ps"
log "  docker compose restart pinn-server"
log ""
log "Deploy log saved to: $LOG"
