#!/bin/bash

# Exit on error
set -e

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
echo "Adding user to docker group..."
sudo usermod -aG docker $USER
echo "You may need to log out and log back in for docker group changes to take effect."

# Create application directory
echo "Creating application directory..."
mkdir -p ~/app
cd ~/app

echo "VPS setup completed successfully!"
echo "Next steps:"
echo "1. Clone your repository to ~/app"
echo "2. Run the deployment script: ./deploy.sh" 