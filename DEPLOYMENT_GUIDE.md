# 🚀 Hướng dẫn Deployment - File Conversion Backend

## 📋 Mục lục

1. [Thiết lập môi trường Development](#thiết-lập-môi-trường-development)
2. [Thiết lập Production với Docker](#thiết-lập-production-với-docker)
3. [Deployment trên aaPanel](#deployment-trên-aapanel)
4. [Monitoring và Maintenance](#monitoring-và-maintenance)

---

## 🛠️ Thiết lập môi trường Development

### 1. Cài đặt Dependencies

#### 1.1 Node.js và npm

```bash
# Cài đặt Node.js 20+ (khuyến nghị sử dụng nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

#### 1.2 Docker (cho macOS Development)

```bash
# Cài đặt Docker Desktop cho macOS
# Tải từ: https://www.docker.com/products/docker-desktop/
# Hoặc sử dụng Homebrew:
brew install --cask docker

# Khởi động Docker Desktop
open -a Docker
```

#### 1.3 MySQL và Redis qua Docker (macOS)

Tạo file `docker-compose.dev.yml` cho development:

```yaml
version: "3.8"

services:
  # MySQL Database
  mysql-dev:
    image: mysql:8.0
    container_name: convert-mysql-dev
    environment:
      - MYSQL_ROOT_PASSWORD=root123
      - MYSQL_DATABASE=convert_db
      - MYSQL_USER=convert_user
      - MYSQL_PASSWORD=dev_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_dev_data:/var/lib/mysql
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    command: --default-authentication-plugin=mysql_native_password

  # Redis for Caching and Queues
  redis-dev:
    image: redis:7-alpine
    container_name: convert-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  # phpMyAdmin (optional, để quản lý database)
  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    container_name: convert-phpmyadmin
    environment:
      - PMA_HOST=mysql-dev
      - PMA_USER=root
      - PMA_PASSWORD=root123
    ports:
      - "8080:80"
    depends_on:
      - mysql-dev
    restart: unless-stopped

volumes:
  mysql_dev_data:
  redis_dev_data:
```

**Khởi động databases:**

```bash
# Tạo và chạy containers
docker-compose -f docker-compose.dev.yml up -d

# Kiểm tra status
docker-compose -f docker-compose.dev.yml ps

# Xem logs
docker-compose -f docker-compose.dev.yml logs -f

# Kết nối MySQL
mysql -h 127.0.0.1 -P 3306 -u convert_user -pdev_password convert_db

# Test Redis
redis-cli ping

# Truy cập phpMyAdmin: http://localhost:8080
```

**Useful commands:**

```bash
# Stop containers
docker-compose -f docker-compose.dev.yml down

# Remove containers and volumes (xóa data)
docker-compose -f docker-compose.dev.yml down -v

# Restart specific service
docker-compose -f docker-compose.dev.yml restart mysql-dev

# Backup database
docker exec convert-mysql-dev mysqldump -u root -proot123 convert_db > backup.sql

# Restore database
docker exec -i convert-mysql-dev mysql -u root -proot123 convert_db < backup.sql
```

#### 1.4 ImageMagick và các công cụ conversion

**Trên macOS:**

```bash
brew install imagemagick ghostscript potrace pdf2svg
```

**Trên Ubuntu/Debian:**

```bash
sudo apt install imagemagick ghostscript potrace pdf2svg
```

### 2. Thiết lập Project

```bash
# Clone và cài đặt dependencies
cd backend
npm install

# Cấu hình environment
cp .env.example .env
# Chỉnh sửa .env theo cấu hình local của bạn

# Thiết lập database
npx prisma migrate dev
npx prisma generatec
npm run seed

# Chạy development server
npm run dev

# Chạy worker (terminal khác)
npm run worker
```

### 3. Cấu hình .env Development (macOS với Docker)

```bash
# Environment Configuration
NODE_ENV=development
PORT=3001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Database Configuration (Docker MySQL)
DATABASE_URL="mysql://convert_user:dev_password@127.0.0.1:3306/convert_db"

# Redis Configuration (Docker Redis)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6379

# JWT Configuration
JWT_SECRET=your-development-jwt-secret
JWT_REFRESH_SECRET=your-development-refresh-secret

# File paths (macOS với Homebrew)
IMAGEMAGICK_PATH=/opt/homebrew/bin/convert
GHOSTSCRIPT_PATH=/opt/homebrew/bin/gs
PDF2SVG_PATH=/opt/homebrew/bin/pdf2svg
POTRACE_PATH=/opt/homebrew/bin/potrace

# Hoặc nếu cài qua system package manager:
# IMAGEMAGICK_PATH=/usr/local/bin/convert
# GHOSTSCRIPT_PATH=/usr/local/bin/gs
# PDF2SVG_PATH=/usr/local/bin/pdf2svg
# POTRACE_PATH=/usr/local/bin/potrace
```

---

## 🐳 Thiết lập Production với Docker

### 1. Chuẩn bị Environment Variables

Tạo file `.env.production`:

```bash
# Production Environment
NODE_ENV=production
PORT=3001

# Frontend URL
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Database (sẽ được tạo bởi Docker)
DB_ROOT_PASSWORD=your_super_secure_root_password
DB_PASSWORD=your_secure_password

# JWT Secrets (tạo secrets mạnh)
JWT_SECRET=your-super-secure-jwt-secret-for-production
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-for-production

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-production
TRUST_PROXY=true
SECURE_COOKIES=true
```

### 2. Tạo SSL Certificates (nếu cần HTTPS)

```bash
# Tạo thư mục SSL
mkdir -p nginx/ssl

# Tự ký certificate cho development/testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/certificate.crt \
  -subj "/C=VN/ST=HCM/L=HCM/O=YourOrg/CN=yourdomain.com"

# Hoặc sử dụng Let's Encrypt cho production thực tế
```

### 3. Deploy với Docker Compose

```bash
# Build và chạy tất cả services
docker-compose --env-file .env.production up -d --build

# Kiểm tra logs
docker-compose logs -f

# Chạy database migrations
docker-compose exec api npx prisma migrate deploy

# Seed database (nếu cần)
docker-compose exec api npm run seed
```

### 4. Useful Docker Commands

```bash
# Xem status của các containers
docker-compose ps

# Restart specific service
docker-compose restart api

# Scale workers
docker-compose up -d --scale worker=3

# Backup database
docker-compose exec db mysqldump -u root -p convert_db > backup.sql

# Restore database
docker-compose exec -T db mysql -u root -p convert_db < backup.sql

# Xem logs realtime
docker-compose logs -f api
docker-compose logs -f worker

# Stop tất cả services
docker-compose down

# Remove tất cả (bao gồm volumes)
docker-compose down -v
```

---

## 🏢 Deployment trên aaPanel (Ubuntu VPS - Tiết kiệm tài nguyên)

### 1. Cài đặt aaPanel

```bash
# Trên Ubuntu 22.04
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh

# Sau khi cài đặt, ghi lại thông tin login
# URL: http://your-server-ip:8888
# Username và password sẽ được hiển thị
```

### 2. Thiết lập qua aaPanel Interface

#### 2.1 Cài đặt Software Stack (Tối ưu cho VPS yếu)

1. Đăng nhập aaPanel web interface
2. Vào **App Store** > cài đặt theo thứ tự:
   - **Nginx** (Latest) - nhẹ hơn Apache
   - **MySQL** (8.0) - chọn cấu hình Memory tối thiểu
   - **Redis** (Latest) - cấu hình memory limit thấp
   - **Node.js Manager** (Node.js 20)
   - **PM2 Manager** (để quản lý Node.js processes)

#### 2.2 Tối ưu hóa MySQL cho VPS yếu

1. **Database** > **MySQL** > **Configuration**
2. Chỉnh sửa `my.cnf`:

```ini
[mysqld]
# Tối ưu cho VPS 1GB RAM
innodb_buffer_pool_size = 128M
innodb_log_file_size = 64M
innodb_file_per_table = 1
innodb_flush_log_at_trx_commit = 2

# General settings
max_connections = 50
query_cache_size = 16M
query_cache_limit = 1M
thread_cache_size = 8
table_open_cache = 64

# Skip reverse DNS lookup
skip-name-resolve
```

3. Restart MySQL và tạo database:
   - Database name: `convert_db`
   - User: `convert_user`
   - Password: tạo password mạnh
   - Assign all privileges

#### 2.3 Tối ưu hóa Redis cho VPS yếu

1. **App Store** > **Redis** > **Configuration**
2. Chỉnh sửa `redis.conf`:

```conf
# Giới hạn memory sử dụng (128MB)
maxmemory 128mb
maxmemory-policy allkeys-lru

# Tắt persistence để tiết kiệm disk I/O (nếu chấp nhận mất data khi restart)
save ""
appendonly no

# Hoặc giữ persistence nhưng giảm frequency
# save 900 1
# save 300 10
# save 60 10000
```

#### 2.4 Thiết lập Website

1. **Website** > **Add Site**
2. Domain: `yourdomain.com`
3. Document Root: `/www/wwwroot/yourdomain.com`
4. PHP Version: None (vì chỉ dùng Node.js)

### 3. Deploy Backend Code

```bash
# SSH vào server
ssh root@your-server-ip

# Tải code
cd /www/wwwroot/yourdomain.com
git clone https://github.com/your-repo/convert-svg.git .
cd backend

# Cài đặt Node.js dependencies
npm install --production --silent

# Cài đặt system dependencies cho file conversion
apt update
apt install -y imagemagick ghostscript potrace pdf2svg

# Tạo thư mục cần thiết
mkdir -p uploads logs
chown -R www-data:www-data uploads logs

# Cấu hình environment cho production
cp .env.production .env

# Cài đặt system dependencies
sudo apt install imagemagick ghostscript potrace pdf2svg

# Run database migrations
npx prisma migrate deploy
npx prisma generate

# Tạo PM2 ecosystem file
```

### 4. Cấu hình PM2 (đã có sẵn ecosystem.config.js)

```bash
# Cài đặt PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Setup PM2 startup
pm2 startup
pm2 save
```

### 5. Cấu hình Nginx Reverse Proxy

Tạo file cấu hình Nginx trong aaPanel:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration (aaPanel có thể tự động cấu hình Let's Encrypt)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # File upload limits
        client_max_body_size 100M;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file uploads
    location /uploads/ {
        alias /www/wwwroot/yourdomain.com/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend (nếu serve từ cùng domain)
    location / {
        root /www/wwwroot/yourdomain.com/frontend/out;
        try_files $uri $uri.html $uri/ =404;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 6. Setup với Docker trên aaPanel

Nếu muốn sử dụng Docker trên aaPanel:

```bash
# Cài đặt Docker qua aaPanel Docker Manager hoặc manually
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Deploy
cd /www/wwwroot/yourdomain.com/backend
docker-compose --env-file .env.production up -d --build
```

---

## 📊 Monitoring và Maintenance

### 1. Health Checks

Tạo health check endpoint (đã có trong code):

```bash
# Kiểm tra API health
curl https://yourdomain.com/api/health

# Kiểm tra database connection
curl https://yourdomain.com/api/health/db

# Kiểm tra Redis connection
curl https://yourdomain.com/api/health/redis
```

### 2. Log Management

```bash
# Xem logs PM2
pm2 logs

# Xem logs specific app
pm2 logs api

# Log rotation
pm2 install pm2-logrotate

# Application logs
tail -f /www/wwwroot/yourdomain.com/backend/logs/app.log
tail -f /www/wwwroot/yourdomain.com/backend/logs/error.log
```

### 3. Database Backup

Tạo script backup tự động:

```bash
#!/bin/bash
# /www/wwwroot/yourdomain.com/scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backup/mysql"
DB_NAME="convert_db"
DB_USER="convert_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/convert_db_$DATE.sql

# Compress
gzip $BACKUP_DIR/convert_db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "convert_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: convert_db_$DATE.sql.gz"
```

Thêm vào crontab:

```bash
# Backup daily at 2 AM
0 2 * * * /www/wwwroot/yourdomain.com/scripts/backup-db.sh
```

### 4. Performance Monitoring

```bash
# Install monitoring tools
npm install -g pm2-monitor

# Monitor PM2 processes
pm2 monit

# System resources
htop
iotop
```

### 5. Security Checklist

- [ ] Firewall cấu hình chỉ mở ports cần thiết (80, 443, SSH)
- [ ] SSL/TLS certificates được cài đặt và auto-renew
- [ ] Database user có permissions tối thiểu
- [ ] Strong passwords cho tất cả services
- [ ] Regular security updates
- [ ] Rate limiting được kích hoạt
- [ ] File upload validation và sanitization
- [ ] CORS cấu hình chính xác
- [ ] Environment variables bảo mật

### 6. Troubleshooting Common Issues

#### API không start:

```bash
# Kiểm tra logs
pm2 logs api

# Kiểm tra database connection
mysql -u convert_user -p convert_db

# Kiểm tra Redis
redis-cli ping
```

#### File conversion errors:

```bash
# Kiểm tra ImageMagick
convert -version

# Kiểm tra Ghostscript
gs --version

# Kiểm tra permissions
ls -la uploads/
```

#### High memory usage:

```bash
# Restart workers
pm2 restart worker

# Scale down/up workers
pm2 scale worker 1
```

---

## 🔧 Quick Commands Reference

### Development

```bash
npm run dev          # Start development server
npm run worker       # Start worker process
npm run migrate      # Run database migrations
npm run seed         # Seed database
npm run studio       # Open Prisma Studio
```

### Production

```bash
pm2 start ecosystem.config.js  # Start all processes
pm2 restart all                # Restart all processes
pm2 logs                       # View logs
pm2 monit                      # Monitor processes
docker-compose up -d           # Start with Docker
docker-compose logs -f         # View Docker logs
```

### Maintenance

```bash
# Update dependencies
npm update

# Database backup
mysqldump -u convert_user -p convert_db > backup.sql

# Clear uploads (older than 7 days)
find uploads/ -mtime +7 -delete

# Restart services
pm2 restart all
```

---

## 📞 Support

Nếu gặp vấn đề trong quá trình deployment, hãy kiểm tra:

1. **Logs**: PM2 logs, application logs, Nginx error logs
2. **Services**: MySQL, Redis, Nginx status
3. **Permissions**: File/folder permissions, user permissions
4. **Network**: Firewall, port accessibility
5. **Resources**: Disk space, memory usage

**Useful debugging commands:**

```bash
# Service status
systemctl status mysql
systemctl status redis
systemctl status nginx

# Port checking
netstat -tlnp | grep :3001
ss -tlnp | grep :3001

# Process monitoring
ps aux | grep node
ps aux | grep mysql
```

Good luck với deployment! 🚀
