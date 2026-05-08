# Stage 1: Build frontend
FROM node:20-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data /app/training/checkpoints

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY backend/main.py /app/main.py

# Copy compiled frontend from builder stage
COPY --from=builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
