FROM node:22-slim
WORKDIR /app

# Cài thư viện trước để tận dụng cache
COPY mcp-weather/package*.json ./mcp-weather/
RUN cd mcp-weather && npm ci
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY mcp-weather ./mcp-weather
COPY backend ./backend

WORKDIR /app/backend
CMD ["npx", "tsx", "src/index.ts"]