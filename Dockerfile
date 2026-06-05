# --- Build Stage ---
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (development + production) for building
RUN npm ci

# Copy all source files
COPY . .

# Build the Vite frontend and bundle the production backend server
RUN npm run build

# --- Runtime Stage ---
FROM node:20-slim

WORKDIR /usr/src/app

# Set Node environment to production
ENV NODE_ENV=production

# Copy only the compiled dist assets and package descriptors from the builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies to minimize image size
RUN npm ci --omit=dev

# Expose port 3000 as strictly required by AI Studio/Cloud Run setup
EXPOSE 3000

# Start compiled server
CMD [ "npm", "start" ]

