ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# DEVELOPMENT
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# BUILDER
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# PRODUCTION
FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "dist/server.js"]