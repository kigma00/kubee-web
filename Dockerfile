# Multi-stage build for Kubee Web
FROM node:18-alpine AS frontend-build

# Frontend build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Python backend
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create necessary directories
RUN mkdir -p /app/backend/api/scan_results

# Expose ports
EXPOSE 8282 3000

# Set environment variables
ENV APP_HOST=0.0.0.0
ENV APP_PORT=8282
ENV APP_DEBUG=false
ENV JWT_SECRET_KEY=your-secret-key-change-in-production

# Initialize database and start server
CMD ["sh", "-c", "python backend/api/init_db.py && python backend/api/server.py"]
