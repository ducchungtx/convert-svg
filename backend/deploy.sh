#!/bin/bash

# File Conversion Backend Deployment Script
# This script handles deployment to aaPanel VPS

set -e

echo "🚀 Starting deployment process..."

# Configuration
APP_NAME="file-conversion-backend"
APP_DIR="/www/wwwroot/convert-api"
BACKUP_DIR="/www/backup"
NODE_VERSION="20"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   print_error "Don't run this script as root. Use a regular user with sudo privileges."
   exit 1
fi

# Create directories if they don't exist
print_status "Creating necessary directories..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKUP_DIR
sudo mkdir -p /www/logs

# Check Node.js version
print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js $NODE_VERSION first."
    exit 1
fi

NODE_CURRENT=$(node -v | sed 's/v//')
if ! [[ "$NODE_CURRENT" =~ ^$NODE_VERSION ]]; then
    print_warning "Node.js version $NODE_CURRENT detected. Recommended: $NODE_VERSION.x"
fi

# Check PM2
print_status "Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
fi

# Backup existing application
if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
    print_status "Creating backup..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    sudo cp -r $APP_DIR $BACKUP_DIR/$BACKUP_NAME
    print_status "Backup created: $BACKUP_DIR/$BACKUP_NAME"
fi

# Copy application files
print_status "Copying application files..."
sudo cp -r ./* $APP_DIR/
sudo chown -R www:www $APP_DIR

# Install dependencies
print_status "Installing dependencies..."
cd $APP_DIR
sudo -u www npm ci --production

# Setup environment file
if [ ! -f "$APP_DIR/.env" ]; then
    print_status "Creating environment file..."
    sudo -u www cp .env.example .env
    print_warning "Please configure .env file with your settings!"
fi

# Create upload directories
print_status "Setting up upload directories..."
sudo -u www mkdir -p uploads/temp
sudo -u www mkdir -p uploads/converted
sudo -u www mkdir -p uploads/originals
sudo -u www mkdir -p logs

# Set correct permissions
print_status "Setting permissions..."
sudo chmod 755 $APP_DIR
sudo chmod -R 755 $APP_DIR/uploads
sudo chmod -R 755 $APP_DIR/logs
sudo chown -R www:www $APP_DIR

# Install system dependencies for file conversion
print_status "Checking system dependencies..."

# ImageMagick
if ! command -v convert &> /dev/null; then
    print_status "Installing ImageMagick..."
    sudo yum install -y ImageMagick ImageMagick-devel || sudo apt-get install -y imagemagick
fi

# Ghostscript
if ! command -v gs &> /dev/null; then
    print_status "Installing Ghostscript..."
    sudo yum install -y ghostscript || sudo apt-get install -y ghostscript
fi

# PDF2SVG
if ! command -v pdf2svg &> /dev/null; then
    print_status "Installing pdf2svg..."
    sudo yum install -y pdf2svg || sudo apt-get install -y pdf2svg
fi

# Potrace for bitmap tracing
if ! command -v potrace &> /dev/null; then
    print_status "Installing potrace..."
    sudo yum install -y potrace || sudo apt-get install -y potrace
fi

# Database setup
print_status "Setting up database..."
sudo -u www npx prisma generate
print_warning "Don't forget to run database migrations manually!"
print_warning "Run: npx prisma migrate deploy"

# PM2 setup
print_status "Setting up PM2..."
sudo -u www pm2 delete $APP_NAME 2>/dev/null || true
sudo -u www pm2 delete file-conversion-worker 2>/dev/null || true
sudo -u www pm2 start ecosystem.config.js

# Setup PM2 startup
print_status "Setting up PM2 startup..."
pm2 startup systemd -u www --hp $APP_DIR
pm2 save

# Setup logrotate
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/file-conversion > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www www
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Setup nginx configuration
print_status "Creating nginx configuration..."
sudo tee /www/server/panel/vhost/nginx/convert-api.conf > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /uploads {
        alias $APP_DIR/uploads;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

print_warning "Please configure nginx with your domain name and SSL certificate!"

# Setup firewall rules
print_status "Checking firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 3001/tcp
elif command -v firewalld &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=3001/tcp
    sudo firewall-cmd --reload
fi

# Health check
print_status "Performing health check..."
sleep 5
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
else
    print_error "❌ Application health check failed!"
    sudo -u www pm2 logs $APP_NAME --lines 20
fi

print_status "🎉 Deployment completed!"
print_status "Application URL: http://your-domain.com"
print_status "PM2 status: pm2 status"
print_status "PM2 logs: pm2 logs $APP_NAME"
print_status "PM2 monitor: pm2 monit"

echo ""
print_warning "⚠️  POST-DEPLOYMENT CHECKLIST:"
print_warning "1. Configure .env file with proper database and Redis settings"
print_warning "2. Run database migrations: npx prisma migrate deploy"
print_warning "3. Update nginx configuration with your domain"
print_warning "4. Setup SSL certificate"
print_warning "5. Configure DNS settings"
print_warning "6. Test file conversion functionality"
print_warning "7. Setup monitoring and alerts"
echo ""
