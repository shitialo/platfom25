# Deployment Guide

This guide explains how to deploy the application to an Ubuntu VPS while maintaining the ability to run it locally for development.

## Local Development

To run the application locally for development:

```bash
docker-compose up
```

This will start the frontend, backend, and database services as defined in `docker-compose.yml`.

## VPS Deployment

### Prerequisites

- Ubuntu VPS (tested on Ubuntu 20.04/22.04)
- SSH access to the VPS
- Domain name (optional but recommended)

### Step 1: Set up the VPS

1. SSH into your VPS:

```bash
ssh user@209.38.149.106
```

2. Clone this repository:

```bash
git clone <your-repository-url> ~/app
cd ~/app
```

3. Make the setup script executable and run it:

```bash
chmod +x setup_vps.sh
./setup_vps.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Add your user to the docker group
- Create the application directory

### Step 2: Deploy the Application

1. Make the deployment script executable:

```bash
chmod +x deploy.sh
```

2. Run the deployment script:

```bash
./deploy.sh
```

This script will:
- Create necessary directories
- Copy production environment variables
- Build and start the Docker containers
- Display the status of the containers

Your application should now be accessible at http://209.38.149.106

### Step 3: Configure SSL (Optional but Recommended)

To secure your application with HTTPS:

1. Install Certbot:

```bash
sudo apt-get update
sudo apt-get install -y certbot
```

2. Obtain SSL certificates:

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Copy the certificates to the nginx/ssl directory:

```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/app/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/app/nginx/ssl/
sudo chown -R $USER:$USER ~/app/nginx/ssl/
```

4. Edit the nginx.conf file to uncomment the HTTPS server block and update the server_name.

5. Redeploy the application:

```bash
./deploy.sh
```

## Maintenance

### Updating the Application

To update the application on the VPS:

1. Pull the latest changes:

```bash
cd ~/app
git pull
```

2. Run the deployment script:

```bash
./deploy.sh
```

### Backing Up the Database

To back up the MySQL database:

```bash
docker exec -it app_db_1 mysqldump -u platform2025 -pwebber1367 platform2025 > backup.sql
```

### Restoring the Database

To restore the MySQL database from a backup:

```bash
cat backup.sql | docker exec -i app_db_1 mysql -u platform2025 -pwebber1367 platform2025
```

## Troubleshooting

### Viewing Logs

To view logs for a specific service:

```bash
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f db
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restarting Services

To restart a specific service:

```bash
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart db
docker-compose -f docker-compose.prod.yml restart nginx
``` 