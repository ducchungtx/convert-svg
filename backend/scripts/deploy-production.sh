#!/bin/bash

# Script deploy production
# Chạy: chmod +x deploy-production.sh && ./deploy-production.sh

set -e

echo "🚀 Production Deployment Script"
echo "================================"

# Kiểm tra môi trường
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️ NODE_ENV chưa được set thành 'production'"
    read -p "Tiếp tục deployment? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 1
    fi
fi

# Backup hiện tại
echo "💾 Tạo backup..."
if [ -d "./backup" ]; then
    rm -rf ./backup.old
    mv ./backup ./backup.old
fi
mkdir -p ./backup

# Backup database
if command -v mysqldump &> /dev/null; then
    echo "📊 Backup database..."
    source .env.production
    DB_USER=$(echo $DATABASE_URL | sed 's/.*\/\/\([^:]*\):.*/\1/')
    DB_PASS=$(echo $DATABASE_URL | sed 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/')
    DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
    
    mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > ./backup/database_$(date +%Y%m%d_%H%M%S).sql
    echo "✅ Database backup hoàn tất"
fi

# Backup uploads
if [ -d "./uploads" ]; then
    echo "📁 Backup uploads..."
    cp -r ./uploads ./backup/
    echo "✅ Uploads backup hoàn tất"
fi

# Pull latest code
echo "📥 Pull latest code..."
if [ -d ".git" ]; then
    git pull origin main
    echo "✅ Code đã được update"
else
    echo "⚠️ Không phải Git repository"
fi

# Install/update dependencies
echo "📦 Update dependencies..."
npm ci --production

# Build (nếu có)
if npm run | grep -q "build"; then
    echo "🔧 Building application..."
    npm run build
fi

# Generate Prisma client
echo "🔧 Generate Prisma client..."
npx prisma generate

# Run migrations
echo "🗄️ Run database migrations..."
npx prisma migrate deploy

# Restart PM2 processes
if command -v pm2 &> /dev/null; then
    echo "🔄 Restart PM2 processes..."
    pm2 restart ecosystem.config.js
    echo "✅ PM2 processes restarted"
fi

# Restart Docker containers (nếu sử dụng Docker)
if [ -f "docker-compose.yml" ]; then
    read -p "Restart Docker containers? (y/n): " RESTART_DOCKER
    if [ "$RESTART_DOCKER" = "y" ] || [ "$RESTART_DOCKER" = "Y" ]; then
        echo "🐳 Restart Docker containers..."
        docker-compose --env-file .env.production down
        docker-compose --env-file .env.production up -d --build
        echo "✅ Docker containers restarted"
    fi
fi

# Health check
echo "🏥 Health check..."
sleep 10

if command -v curl &> /dev/null; then
    HEALTH_URL="http://localhost:3001/api/health"
    if curl -f $HEALTH_URL > /dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
        echo "Checking logs..."
        if command -v pm2 &> /dev/null; then
            pm2 logs --lines 10
        fi
        exit 1
    fi
else
    echo "⚠️ curl không có sẵn, bỏ qua health check"
fi

# Cleanup old backups
echo "🧹 Cleanup old backups..."
find ./backup* -mtime +7 -delete 2>/dev/null || true

echo ""
echo "🎉 Deployment hoàn tất!"
echo "========================"
echo "Ứng dụng đang chạy tại production"
echo "Health check: http://localhost:3001/api/health"
echo "Logs: pm2 logs"
