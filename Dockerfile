# Use Node.js 20 (matching your .nvmrc)
FROM node:20-alpine AS base

# Install necessary build tools for bcrypt and other native modules
RUN apk add --no-cache python3 make g++ curl

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-workspace.yaml ./

# Copy workspace package files
COPY api/backend/package.json ./api/backend/
COPY web/package.json ./web/

# Install dependencies at root level first
RUN pnpm install

# Copy the rest of the application
COPY . .

# Build bcrypt in api/backend
WORKDIR /app/api/backend
RUN pnpm install
RUN pnpm add bcrypt@5.1.1

# Build the backend
RUN pnpm run build

# Return to root directory
WORKDIR /app

# Build the web application
WORKDIR /app/web
RUN pnpm install
RUN pnpm run build

# Return to root directory
WORKDIR /app

# Production image
FROM node:20-alpine AS production

# Install necessary runtime dependencies for bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy built app from base stage
COPY --from=base /app/api/backend/dist ./api/backend/dist
COPY --from=base /app/api/backend/node_modules ./api/backend/node_modules
COPY --from=base /app/api/backend/package.json ./api/backend/package.json

COPY --from=base /app/web/.next ./web/.next
COPY --from=base /app/web/public ./web/public
COPY --from=base /app/web/node_modules ./web/node_modules
COPY --from=base /app/web/package.json ./web/package.json

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production

# Start each service separately instead of trying to start both at once
CMD ["npm", "run", "start:api"]

# Expose ports
EXPOSE 3000 8000