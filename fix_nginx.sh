#!/bin/bash

# Create the frontend/dist directory if it doesn't exist
mkdir -p frontend/dist

# Copy the test index.html to the frontend/dist directory
cp frontend/dist/index.html frontend/dist/index.html.bak 2>/dev/null || echo "No backup needed"

# Set proper permissions
chmod -R 755 frontend/dist
chmod -R 755 nginx

# Rebuild and restart the containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Check the status
docker ps

echo "Nginx configuration has been updated. Please check http://209.38.149.106 again." 