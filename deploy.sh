#!/bin/bash

# Configuration
REMOTE_USER="blue"
REMOTE_HOST="209.38.149.106"
REMOTE_DIR="/home/blue/platfom25"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Platform25 Deployment Script ===${NC}"

# Ensure the remote directory exists with correct permissions
echo -e "${YELLOW}Setting up remote directory...${NC}"
ssh -t $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR"

# Build frontend before deployment
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm run build
cd ..

# Create a temporary tar file
echo -e "${YELLOW}Creating temporary archive...${NC}"
tar --exclude='node_modules' --exclude='.git' --exclude='frontend/node_modules' -czf deploy.tar.gz ./*

# Copy project files
echo -e "${YELLOW}Copying project files to server...${NC}"
scp deploy.tar.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/
rm deploy.tar.gz

# Extract and deploy on the remote server
echo -e "${YELLOW}Deploying application...${NC}"
ssh -t $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    tar xzf deploy.tar.gz && \
    rm deploy.tar.gz && \
    chmod -R 755 frontend/dist && \
    chmod -R 755 nginx && \
    chmod -R 755 backend/uploads && \
    docker-compose -f $DOCKER_COMPOSE_FILE down || true && \
    docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d && \
    echo 'Checking container status:' && \
    docker ps"

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}Your application should now be running at http://$REMOTE_HOST${NC}"
echo -e "${YELLOW}If you encounter any issues, check the logs with:${NC}"
echo -e "  ssh $REMOTE_USER@$REMOTE_HOST \"cd $REMOTE_DIR && docker-compose -f $DOCKER_COMPOSE_FILE logs\""
echo -e "${YELLOW}To check specific container logs:${NC}"
echo -e "  ssh $REMOTE_USER@$REMOTE_HOST \"cd $REMOTE_DIR && docker logs platfom25-nginx-1\""
echo -e "  ssh $REMOTE_USER@$REMOTE_HOST \"cd $REMOTE_DIR && docker logs platfom25-backend-1\"" 