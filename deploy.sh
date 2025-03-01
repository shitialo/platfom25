#!/bin/bash

# Exit on error
set -e

# Create necessary directories
mkdir -p nginx/ssl

# Copy environment variables
cp .env.prod .env

# Build and start the containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Display container status
docker-compose -f docker-compose.prod.yml ps

echo "Deployment completed successfully!"
echo "Your application is now running at http://209.38.149.106" 