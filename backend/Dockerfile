FROM node:22-slim
WORKDIR /app

# Cài thư viện trước để tận dụng cache
COPY mcp-weather/package*.json ./mcp-weather/
RUN cd mcp-weather && npm ci
COPY mcp-calendar/package*.json ./mcp-calendar/
RUN cd mcp-calendar && npm ci
COPY mcp-hackernews/package*.json ./mcp-hackernews/
RUN cd mcp-hackernews && npm ci
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY mcp-weather ./mcp-weather
COPY mcp-calendar ./mcp-calendar
COPY mcp-hackernews ./mcp-hackernews
COPY backend ./backend

WORKDIR /app/backend
CMD ["npx", "tsx", "src/index.ts"]