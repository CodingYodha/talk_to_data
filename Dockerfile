# ============================================
# Talk to Data - Multi-stage Dockerfile
# Builds frontend and serves everything from Python
# ============================================

# ============ STAGE 1: Build Frontend ============
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (better caching)
COPY frontend/package*.json ./
RUN npm ci --silent

# Build the frontend
COPY frontend/ ./
RUN npm run build

# ============ STAGE 2: Python Backend ============
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for database drivers
RUN apt-get update && apt-get install -y --no-install-recommends \
    # PostgreSQL driver
    libpq-dev \
    gcc \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    # Add database drivers
    psycopg2-binary \
    pymysql

# Copy backend code
COPY backend/ ./backend/

# Copy assets (including demo database)
COPY assets/ ./assets/

# Copy frontend build from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run the server
WORKDIR /app/backend
CMD ["python", "main.py"]
