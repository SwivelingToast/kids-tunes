# --- frontend build ---
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- backend build ---
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
# build tools as a fallback in case no prebuilt better-sqlite3 binary
# matches this image's platform/arch and it has to compile from source
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- runtime ---
FROM node:22-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
