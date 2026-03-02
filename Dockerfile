# ── Multistage Dockerfile for Digital Twin Production ──────────────────────────
# Targets NVIDIA CUDA base for hardware-accelerated PyTorch Inference

# ── Stage 1: Build Dependencies ──────────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /build

# Install build essentials for compiling certain python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-pinn.txt ./requirements.txt

# Install dependencies into a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install wheels
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Production Image (CPU/CUDA Unified) ───────────────────────────
# Use Python slim base image. PyTorch pip wheels bundle their own CUDA runtime 
# libraries, so we don't strictly need the bloated nvidia/cuda image for inference.
# This ensures it runs natively on CPU if GPUs are absent.
FROM python:3.10-slim

# Set python env vars
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Install Python and essential runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy actual backend microservice code
COPY backend/ ./backend/

# Expose FastAPI port
EXPOSE 8000

# Run the unified Uvicorn server (Production ready without --reload)
CMD ["uvicorn", "backend.pinn_server.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
