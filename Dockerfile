# Use the official Node.js 20 image as a base image for the build stage
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the source files and build the application
COPY src ./src
RUN npm run build

# Use the official Node.js 20 image as a base image for the production stage
FROM node:20-alpine

# Install serve for serving the built app
RUN npm install -g serve

# Copy the built app from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Run the app using serve
CMD ["serve", "-s", "dist", "-l", "3000"]