# Use Node.js 20 (matching your .nvmrc)
FROM node:20-alpine AS base

# Install pnpm (better for monorepos)
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy all workspace configs
COPY api/backend/package.json ./api/backend/
COPY web/package.json ./web/

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the applications
RUN pnpm run build

# Production image
FROM node:20-alpine AS production

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

# Start command
CMD ["npm", "run", "start"]

# Expose ports
EXPOSE 3000 8000